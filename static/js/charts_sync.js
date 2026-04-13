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

    const topLanguages = result.top_languages || []

    const labels = topLanguages.map(item => item.language)
    const linesData = topLanguages.map(item => item.lines)
    const filesData = topLanguages.map(item => item.files).sort((a, b) => b - a);

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

    // 기존 내용 제거
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

  } catch (error) {
    console.error('analysis 실패:', error)
  }
}
