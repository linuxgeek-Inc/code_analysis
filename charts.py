from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, HttpUrl
import subprocess
import tempfile
import json
from typing import Any
from pathlib import Path

app = FastAPI()
app.mount("/assets", StaticFiles(directory="static"), name="assets")

@app.get("/")
def read_index():
    return FileResponse("templates/charts.html")
