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
const $search = $n("div")
const $input = $n("input")
const $submit = $n("button")
let $attached_user

window.onpopstate = function (e) {
	input.value = e.state
	displayUser(true)
}

async function displayUser(skiphist) {
	let $loader = viewLoading()

	if (!$input.value) {
		$client.appendChild(viewError("Must specify handle"))
		return
	}

	if ($attached_user) $client.removeChild($attached_user)
	$client.appendChild($loader)

	if (!skiphist) history.pushState($input.value, "", "?handle=" + encodeURIComponent($input.value))
	document.title = $input.value + " | a2oj ladder"

	try {
		data = await getSolveData($input.value)
		$attached_user = viewUserContent(data)
		$client.appendChild($attached_user)
	} catch(e) {
		console.error(e)
		if (e.name == 'TypeError') $client.appendChild(viewError("Non-existent handle or other network error"))
	}
	$client.removeChild($loader)
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
		else         $client.classList.remove("hide-solved")
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
			displayUser()
		}
	}
	$submit.onclick = displayUser
	$submit.innerText = "Check"

	return $search
}

function viewUserContent(data) {
	const solved = getSolvedStatus(data)
	const $user = $n("div")

	$user.classList.add("user")

	for (let setname in sets) {
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

		let ctSolved = 0
		let ctWrong = 0

		sets[setname].forEach((e) => {
			const $problem = $n("a", "problem")
			const $problem_desc = $n("div", "problem-desc")
			const $problem_diff = $n("div", "problem-diff")
			const index = getProblemString(e.link)

			$problem.href = e.link
			$problem_desc.innerHTML = `<span class="problem-index">${index}</span> ${e.name}`
			$problem_diff.innerText = e.diff

			if (index in solved) {
				$problem.classList.add("verdict-"+solved[index])
				if (solved[index] == "OK") ctSolved ++
				else ctWrong ++
			}

			$set_list.appendChild($problem)
			$problem.appendChild($problem_desc)
			$problem.appendChild($problem_diff)
		})

		$set_name.innerHTML = `<b>${setname}</b>`
		if (ctSolved || ctWrong) $set_name.innerHTML += ` - `
		if (ctSolved)            $set_name.innerHTML += `<span class="verdict-OK">${ctSolved}</span>`
		if (ctSolved && ctWrong) $set_name.innerHTML += ` / `
		if (ctWrong)             $set_name.innerHTML += `<span class="verdict-WRONG">${ctWrong}</span>`

		$set_name.onclick = function (e) {
			$set_list.dataset.show = $set_list.dataset.show ? "" : "true"
		}
	}

	return $user
}

function viewLoading(data) {
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
		client.removeChild(error)
	}

	return $error
}

async function get(url) {
	const resp = await fetch(url)
	const json = await resp.json()
	return json
}

async function getSolveData(username) {
	return get("https://codeforces.com/api/user.status?from=1&count=10000&handle="+encodeURIComponent(username))
}

function getProblemString(url) {
	let s = url.split("/")
	return s[s.length-2] + s[s.length-1]
}

function getSolvedStatus(data) {
	const m = {}
	data.result.forEach((e) => {
		const problemName = "" + e.problem.contestId + e.problem.index
		if (e.verdict === "OK")                            m[problemName] = "OK"
		if (e.verdict !== "OK" && m[problemName] !== "OK") m[problemName] = "WRONG"
	})
	return m
}

client.appendChild(viewOptions())
client.appendChild(viewSearchPage())

const handle = new URLSearchParams(window.location.search).get("handle")
if (handle) {
	$input.value = handle
	displayUser(true)
}
