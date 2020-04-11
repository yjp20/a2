$ = function (s) {
	return document.querySelectorAll(s)
}

$s = function (s) {
	return document.querySelector(s)
}

$n = function (s) {
	return document.createElement(s)
}

const client = $s("#client")
let search = $n("div")
let input = $n("input")
let submit = $n("button")
let user

window.onpopstate = function (e) {
	input.value = e.state
	displayUser(true)
}

async function displayUser(skiphist) {
	let loader = viewLoading()

	if (!input.value) {
		client.appendChild(viewError("Must specify handle"))
		return
	}

	if (user) client.removeChild(user)
	client.appendChild(loader)

	try {
		data = await getSolveData(input.value)

		// Handle history
		if (!skiphist) history.pushState(input.value, "", "?handle=" + encodeURIComponent(input.value))
		document.title = input.value + " | a2oj ladder"

		// Display data
		user = viewUserContent(data)
		client.appendChild(user)
	} catch(e) {
		if (e.name == 'TypeError') client.appendChild(viewError("Non-existent handle or other network error"))
	}
	client.removeChild(loader)
}

function viewSearchPage() {
	search.appendChild(input)
	search.appendChild(submit)
	search.id = "search"

	input.setAttribute("placeholder", "Codeforces ID")
	input.onkeydown = async function (e) {
		if (e.key === "Enter") {
			displayUser()
		}
	}
	submit.onclick = displayUser
	submit.innerText = "Check"

	return search
}

function viewUserContent(data) {
	let solved = getSolvedStatus(data)
	let user = $n("div")

	user.classList.add("user")

	for (let setname in sets) {
		let set = $n("div")
		let name = $n("button")
		let table = $n("table")

		let header = $n("tr")
		let header_name = $n("th")
		let header_diff = $n("th")
		header_name.innerText = "Name"
		header_diff.innerText = "Diff"
		header.appendChild(header_name)
		header.appendChild(header_diff)
		table.appendChild(header)

		let ctSolved = 0
		let ctWrong = 0
		sets[setname].forEach((e) => {
			let problem = $n("tr")
			let link_cell = $n("td")
			let link = $n("a")
			let diff = $n("td")
			let index = getProblemString(e.link)

			link.href = e.link
			link.innerText = e.name
			diff.innerText = e.diff

			if (index in solved) {
				link.classList.add("verdict-"+solved[index])

				if (solved[index] == "OK")
					ctSolved ++
				else
					ctWrong ++
			}

			link_cell.appendChild(link)
			problem.appendChild(link_cell)
			problem.appendChild(diff)
			table.appendChild(problem)
		})

		name.innerHTML = `<b> ${setname} </b`
		if (ctSolved || ctWrong) name.innerHTML += ` - `
		if (ctSolved) name.innerHTML += `<span class="verdict-OK">${ctSolved}</span>`
		if (ctSolved && ctWrong) name.innerHTML += ` / `
		if (ctWrong) name.innerHTML += `<span class="verdict-WRONG">${ctWrong}</span>`
		name.classList.add("name")
		set.classList.add("set")
		set.appendChild(name)
		set.appendChild(table)
		user.appendChild(set)

		name.onclick = function (e) {
			table.dataset.show = table.dataset.show ? "" : "true"
		}
	}

	console.log(data)
	return user
}

function viewLoading(data) {
	let loader = $n("div")
	loader.classList.add("loader")
	loader.classList.add("lds-ring")
	loader.appendChild($n("div"))
	loader.appendChild($n("div"))
	loader.appendChild($n("div"))
	loader.appendChild($n("div"))
	return loader
}

function viewError(msg) {
	let error = $n("div")
	let close = $n("div")

	error.classList.add("error")
	error.innerText = msg
	error.appendChild(close)
	close.classList.add("close")
	close.onclick = function (e) {
		client.removeChild(error)
	}
	return error
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
	// regex is easier and safer, but significantly slower
	// as such we use a basic split operation
	let s = url.split("/")
	return s[s.length-2] + s[s.length-1]
}

function getSolvedStatus(data) {
	let m = {}
	data.result.forEach((e) => {
		var problemName = "" + e.problem.contestId + e.problem.index
		if (e.verdict === "OK")                            m[problemName] = "OK"
		if (e.verdict !== "OK" && m[problemName] !== "OK") m[problemName] = "WRONG"
	})
	return m
}

client.appendChild(viewSearchPage())
