$ = function (s) {
	return document.querySelectorAll(s)
}

$s = function (s) {
	return document.querySelector(s)
}

$n = function (s, className) {
	const el = document.createElement(s)
	if (className) el.classList.add(className)
	return el
}

const $client = $s("#client")
const $container = $n("div", "container")
const $search = $n("div")
const $input = $n("input")
const $submit = $n("button")
let $attached_user
let $attached_timeline
let last_username

window.onpopstate = function (e) {
	$input.value = e.state
	query(true)
}

async function query(skiphist) {
	if (last_username != $input.value) {
		last_username = $input.value
		last_state = undefined
		displayUser(skiphist)
	} else {
		updateUser()
	}
}

async function displayUser(skiphist) {
	let $loader = viewLoading()

	if (!$input.value) {
		$container.appendChild(viewError("Must specify handle"))
		return
	}

	if ($attached_timeline) $container.removeChild($attached_timeline)
	if ($attached_user) $container.removeChild($attached_user)
	$container.appendChild($loader)

	if (!skiphist)
		history.pushState(
			$input.value,
			"",
			"?handle=" + encodeURIComponent($input.value)
		)
	document.title = $input.value + " | a2oj ladder"

	try {
		const data = await getSolveData($input.value)
		$attached_timeline = viewUserTimeline()
		$attached_timeline.update(data, $input.value)
		$attached_user = viewUserContent()
		$attached_user.update(data)
		$container.appendChild($attached_user)
		$container.appendChild($attached_timeline)
	} catch (e) {
		console.error(e)
		if (e.name == "TypeError")
			$container.appendChild(
				viewError("Non-existent handle or other network error")
			)
	}
	$container.removeChild($loader)
}

async function updateUser() {
	const data = await getSolveData($input.value)
	$attached_user.update(data)
	$attached_timeline.update(data, $input.value)
}

function viewOptions() {
	const $options = $n("div", "options")
	const $hide_solved = $n("label", "checkbox")
	const $checkbox = $n("input")
	const $checkbox_virtual = $n("div", "checkbox-mark")
	const $hide_solved_text = $n("div", "checkbox-text")

	$hide_solved_text.innerText = "hide solved"

	$checkbox.type = "checkbox"
	$checkbox.onclick = function (e) {
		const checked = e.currentTarget.checked
		if (checked) $client.classList.add("hide-solved")
		else $client.classList.remove("hide-solved")
	}

	$options.appendChild($hide_solved)
	$hide_solved.appendChild($checkbox)
	$hide_solved.appendChild($checkbox_virtual)
	$hide_solved.appendChild($hide_solved_text)
	return $options
}

function viewSearchPage() {
	$search.appendChild($input)
	$search.appendChild($submit)
	$search.id = "search"

	$input.setAttribute("placeholder", "Codeforces ID")
	$input.onkeydown = async function (e) {
		if (e.key === "Enter") {
			query()
		}
	}
	$submit.onclick = query
	$submit.innerText = "Check"

	return $search
}

function viewUserTimeline() {
	const context = {}
	const $timeline_container = $n("div", "timeline-container")
	const $unique = $n("div", "timeline-unique")
	const $diff_sum = $n("div", "timeline-diff-sum")
	const $timeline = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"svg"
	)

	$timeline_container.appendChild($unique)
	$timeline_container.appendChild($diff_sum)
	$timeline_container.appendChild($timeline)

	$timeline.setAttribute("width", 108)
	$timeline.setAttribute("height", 844)
	$timeline.classList.add("timeline")

	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const monday = new Date(today)
	monday.setDate(monday.getDate() - ((today.getDay() + 6) % 7))
	const last_month = new Date(today)
	last_month.setMonth(today.getMonth() - 1)
	last_month.setHours(0, 0, 0, 0)

	for (let i = 0; i < 365; i++) {
		const marker = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"rect"
		)
		marker.classList.add("timeline-marker")
		const d = new Date(today)
		d.setDate(d.getDate() - i)
		context[d.getTime()] = marker
		marker.setAttribute("x", ((d.getDay() + 6) % 7) * 16)
		marker.setAttribute(
			"y",
			(Math.floor((dateDiffInDays(d, monday) - 1) / 7) + 1) * 16
		)
		marker.setAttribute("width", 12)
		marker.setAttribute("height", 12)
		$timeline.appendChild(marker)
	}

	function update(data, name) {
		const [solved, solvedOn, firstSolved] = getSolvedStatus(data)

		const counted = {}
		let count = 0
		let difficulty = 0

		for (let setname in sets) {
			for (let problem of sets[setname]) {
				const index = getProblemString(problem.link)
				if (index in firstSolved && !counted[index]) {
					count ++
					difficulty += parseInt(problem.diff, 10)
					counted[index] = true
				}
			}
		}

		$unique.innerHTML = `<b>Solved:</b> ${count}`
		$diff_sum.innerHTML = `<b>Difficulty:</b> ${difficulty}`
		for (let date in solvedOn) {
			if (date in context) {
				context[date].dataset.count =
					solvedOn[date].length < 5 ? solvedOn[date].length : "5+"
			}
		}
	}

	$timeline_container.update = update

	return $timeline_container
}

function viewUserContent() {
	const context = {}
	const $user = $n("div", "user")

	for (let set_name in sets) {
		const $set = $n("div", "set")
		const $set_name = $n("button", "set-name")
		const $set_list = $n("div", "set-list")
		const $set_header = $n("div", "set-header")
		const $set_header_name = $n("div", "set-header-name")
		const $set_header_diff = $n("div", "set-header-diff")
		$set_header_name.innerText = "Name"
		$set_header_diff.innerText = "Diff"

		$user.appendChild($set)
		$set.appendChild($set_name)
		$set.appendChild($set_list)
		$set_list.appendChild($set_header)
		$set_header.appendChild($set_header_name)
		$set_header.appendChild($set_header_diff)

		$set_name.innerHTML = `<b>${set_name}</b>`
		$set_name.onclick = function (e) {
			$set_list.dataset.show = $set_list.dataset.show ? "" : "true"
		}

		context[set_name] = { $set_name, problems: {} }

		for (let problem of sets[set_name]) {
			const $problem = $n("a", "problem")
			const $problem_desc = $n("div", "problem-desc")
			const $problem_diff = $n("div", "problem-diff")
			const index = getProblemString(problem.link)

			$set_list.appendChild($problem)
			$problem.appendChild($problem_desc)
			$problem.appendChild($problem_diff)

			$problem.href = problem.link
			$problem_desc.innerHTML = `<span class="problem-index">${index}</span> ${problem.name}`
			$problem_diff.innerText = problem.diff

			context[set_name].problems[index] = $problem
		}
	}

	function update(data) {
		const [solved, solvedOn, firstSolved] = getSolvedStatus(data)

		for (let set_name in sets) {
			const $set_name = context[set_name].$set_name

			let ctSolved = 0
			let ctWrong = 0

			for (let problem of sets[set_name]) {
				const index = getProblemString(problem.link)
				const $problem = context[set_name].problems[index]
				if (index in solved) {
					$problem.classList.add("verdict-" + solved[index])
					if (solved[index] == "OK") ctSolved++
					else ctWrong++
				}
			}

			$set_name.innerHTML = `<b>${set_name}</b>`
			if (ctSolved || ctWrong) $set_name.innerHTML += ` - `
			if (ctSolved)
				$set_name.innerHTML += `<span class="verdict-OK">${ctSolved}</span>`
			if (ctSolved && ctWrong) $set_name.innerHTML += ` / `
			if (ctWrong)
				$set_name.innerHTML += `<span class="verdict-WRONG">${ctWrong}</span>`
		}
	}
	$user.update = update
	return $user
}

function viewLoading() {
	const $loader = $n("div")
	$loader.classList.add("loader")
	$loader.classList.add("lds-ring")
	$loader.appendChild($n("div"))
	$loader.appendChild($n("div"))
	$loader.appendChild($n("div"))
	$loader.appendChild($n("div"))
	return $loader
}

function viewError(msg) {
	const $error = $n("div", "error")
	const $close = $n("div", "close")

	$error.appendChild(close)
	$error.innerText = msg
	$close.onclick = function (e) {
		$container.removeChild(error)
	}

	return $error
}

async function get(url) {
	const resp = await fetch(url)
	const json = await resp.json()
	return json
}

async function getSolveData(username) {
	return get(
		"https://codeforces.com/api/user.status?from=1&count=10000&handle=" +
			encodeURIComponent(username)
	)
}

function getProblemString(url) {
	let s = url.split("/")
	return s[s.length - 2] + s[s.length - 1]
}

function getSolvedStatus(data) {
	const m = {}
	const firstSolved = {}
	const solvedOn = {}

	for (let e of data.result) {
		const problemDate = new Date(e.creationTimeSeconds * 1000)
		problemDate.setHours(0, 0, 0, 0)
		const problemName = "" + e.problem.contestId + e.problem.index
		if (e.verdict === "OK") {
			m[problemName] = "OK"
			firstSolved[problemName] = problemDate
		}
		if (e.verdict !== "OK" && m[problemName] !== "OK") {
			m[problemName] = "WRONG"
		}
	}

	for (let problemName in firstSolved) {
		let problemDate = firstSolved[problemName]
		if (!solvedOn[problemDate.getTime()]) solvedOn[problemDate.getTime()] = []
		solvedOn[problemDate.getTime()].push(problemName)
	}

	return [m, solvedOn, firstSolved]
}

function dateDiffInDays(a, b) {
	const _MS_PER_DAY = 1000 * 60 * 60 * 24
	const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
	const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
	return Math.floor((utc2 - utc1) / _MS_PER_DAY)
}

$client.appendChild(viewOptions())
$client.appendChild(viewSearchPage())
$client.appendChild($container)

const handle = new URLSearchParams(window.location.search).get("handle")
if (handle) {
	$input.value = handle
	query(true)
}
