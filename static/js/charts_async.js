/**
 * Chart.js dynamic update with FastAPI
 */

const barConfig = {
    type: 'bar',
    data: {
	labels: [],
	datasets: [
	    {
		label: 'Code Files',
		backgroundColor: '#7e3af2',
		borderWidth: 1,
		data: [],
	    },
	],
    },
    options: {
	responsive: true,
	legend: {
	    display: true,
	},
    },
}

const pieConfig = {
    type: 'doughnut',
    data: {
	datasets: [
	    {
		data: [],
		backgroundColor: [
		    '#0694a2',
		    '#1c64f2',
		    '#7e3af2',
		    '#0e9f6e',
		    '#f59e0b',
		],
		label: 'Top Languages',
	    },
	],
	labels: [],
    },
    options: {
	responsive: true,
	cutoutPercentage: 80,
	legend: {
	    display: false,
	},
    },
}

const barsCtx = document.getElementById('bars')
const pieCtx = document.getElementById('pie')

window.myBar = new Chart(barsCtx, barConfig)
window.myPie = new Chart(pieCtx, pieConfig)

function parseGitHubUrl(githubUrl) {
    const url = new URL(githubUrl)
    const parts = url.pathname.split('/').filter(Boolean)

    if (url.hostname !== 'github.com' || parts.length < 2) {
	throw new Error('올바른 GitHub 저장소 URL이 아닙니다.')
    }

    const owner = parts[0]
    const repoName = parts[1]

    return { owner, repoName }
}

async function startAnalysis(githubUrl) {
    try {
	const { owner, repoName } = parseGitHubUrl(githubUrl)

	const response = await fetch(`analysis/${owner}/${repoName}`)
	const result = await response.json()

	if (!response.ok) {
	    console.error(result)
	    return
	}

	// 1) 아직 분석중
	if (result.status === 'processing') {
	    show_loading(true);
	    console.log(result.detail || '분석 진행중')

	    // 잠시 후 다시 요청
	    setTimeout(() => {
		startAnalysis(githubUrl)
	    }, 5000)
	    return
	}

	// 2) 분석 실패
	if (result.status === 'failed') {
	    show_loading(false);
	    alert('분석 실패:', result.detail);
	    return
	}

	// 3) 분석 완료
	const topLanguages = result.top_languages || []

	const labels = topLanguages.map(item => item.language)
	const linesData = topLanguages.map(item => item.lines)
	const filesData = topLanguages.map(item => item.files)

	const COLORS = [
	    '#0694a2',
	    '#1c64f2',
	    '#7e3af2',
	    '#0e9f6e',
	    '#f59e0b',
	]

	// =========================
	// 📊 Bar Chart 업데이트
	// =========================
	window.myBar.data.labels = labels
	window.myBar.data.datasets = [
	    {
		label: 'Files',
		backgroundColor: '#7e3af2',
		data: filesData,
	    },
	]
	window.myBar.update()

	// =========================
	// 🥧 Pie Chart 업데이트
	// =========================
	window.myPie.data.labels = labels
	window.myPie.data.datasets[0].data = linesData
	window.myPie.data.datasets[0].backgroundColor = COLORS
	window.myPie.update()

	// =========================
	// 🧩 Legend (top_lang) 동적 생성
	// =========================
	const topLangDiv = document.getElementById('top_lang')
	topLangDiv.innerHTML = ''

	topLanguages.forEach((item, index) => {
	    const color = COLORS[index % COLORS.length]

	    const element = document.createElement('div')
	    element.className = 'flex items-center'

	    element.innerHTML = `
        <span
          class="inline-block w-3 h-3 mr-1 rounded-full"
          style="background-color: ${color}"
        ></span>
        <span>${item.language}</span>
      `

	    topLangDiv.appendChild(element)
	})
	show_loading(false);
    } catch (error) {
	console.error('analysis 실패:', error)
    }
}

function show_loading(on_off) {
  if (on_off) {
    const fullsizeWidth = document.body.clientWidth
    const fullsizeHeight = document.documentElement.scrollHeight

    // 🔳 배경 마스크
    if (!document.getElementById('mask')) {
      const mask = document.createElement('div')
      mask.id = 'mask'
      mask.style.position = 'fixed'
      mask.style.zIndex = '999'
      mask.style.backgroundColor = 'rgba(0,0,0,0.3)'
      mask.style.left = '0'
      mask.style.top = '0'
      mask.style.width = '100%'
      mask.style.height = '100%'
      document.body.appendChild(mask)
    }

    // 🔄 스피너
    if (!document.getElementById('loading_spinner')) {
      const spinner = document.createElement('div')
      spinner.id = 'loading_spinner'

      spinner.style.position = 'fixed'
      spinner.style.top = '50%'
      spinner.style.left = '50%'
      spinner.style.width = '60px'
      spinner.style.height = '60px'
      spinner.style.margin = '-30px 0 0 -30px' // 정확히 중앙
      spinner.style.border = '6px solid #f3f3f3'
      spinner.style.borderTop = '6px solid #3498db'
      spinner.style.borderRadius = '50%'
      spinner.style.animation = 'spin 1s linear infinite'
      spinner.style.zIndex = '1000'

      document.body.appendChild(spinner)
    }

    // 🔁 애니메이션 keyframes 추가 (한 번만)
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style')
      style.id = 'spinner-style'
      style.innerHTML = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
      document.head.appendChild(style)
    }

  } else {
    const mask = document.getElementById('mask')
    if (mask) mask.remove()

    const spinner = document.getElementById('loading_spinner')
    if (spinner) spinner.remove()
  }
}
