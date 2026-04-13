from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
import subprocess
import tempfile
import json
import time
from typing import Any
from pathlib import Path

app = FastAPI()
app.mount("/assets", StaticFiles(directory="static"), name="assets")

@app.get("/")
def read_index():
    return FileResponse("templates/main_sync.html")


class AnalysisRequest(BaseModel):
    github_url: HttpUrl


def run_command(cmd: list[str], cwd: str | None = None) -> subprocess.CompletedProcess:
    start_time = time.perf_counter()
    print(str(cmd))
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=True,
        )
        duration = (time.perf_counter() - start_time)
        print(f"Duration: %.1f s" % duration)
        return result
    except subprocess.CalledProcessError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "message": "명령 실행 중 오류가 발생했습니다.",
                "command": cmd,
                "stdout": e.stdout,
                "stderr": e.stderr,
            },
        ) from e
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=500,
            detail=f"필수 실행 파일을 찾을 수 없습니다: {cmd[0]}",
        ) from e


def extract_top_languages(cloc_json: dict[str, Any], top_n: int = 5) -> list[dict[str, Any]]:
    """
    cloc 결과에서 언어별 code 라인 수 기준 상위 N개 추출
    """
    ignored_keys = {"header", "SUM"}

    languages = []
    for key, value in cloc_json.items():
        if key in ignored_keys:
            continue
        if not isinstance(value, dict):
            continue

        code_count = value.get("code", 0)
        file_count = value.get("nFiles", 0)

        languages.append({
            "language": key,
            "lines": code_count,
            "files": file_count,
        })

    languages.sort(key=lambda x: x["lines"], reverse=True)
    return languages[:top_n]


@app.get("/analysis/{owner}/{repo_name:path}")
def analyze_repository_get(owner: str, repo_name: str):
    if not owner.strip() or not repo_name.strip():
        raise HTTPException(status_code=400, detail="owner 또는 repo_name 이 비어 있습니다.")

    # repo_name 정리 (.git 중복 방지)
    repo_name = repo_name.removesuffix(".git")

    github_url = f"https://github.com/{owner}/{repo_name}.git"
    with tempfile.TemporaryDirectory() as tmp_dir:
        repo_dir = Path(tmp_dir) / "repo"

        # git clone
        run_command([
            "git",
            "clone",
            "--depth",
            "1",
            github_url,
            str(repo_dir),
        ])

        if not repo_dir.exists():
            raise HTTPException(
                status_code=500,
                detail="저장소 클론에 실패했습니다.",
            )

        # cloc 실행
        cloc_result = run_command([
            "cloc",
            "--json",
            str(repo_dir),
        ])

        try:
            cloc_json = json.loads(cloc_result.stdout)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500,
                detail="cloc 결과 파싱 실패"
            )

        top_languages = extract_top_languages(cloc_json, top_n=5)

        result_data = {
            "github_url": github_url,
            "top_languages": top_languages,
        }

        return result_data
