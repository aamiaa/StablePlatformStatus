require("dotenv").config();

const fs = require("fs");
const {parse} = require("node-html-parser");
const {XMLParser} = require("fast-xml-parser");

let lastData;
if(fs.existsSync("last.dat")) {
	lastData = JSON.parse(fs.readFileSync("last.dat").toString())
}

async function GetIncidentInfo(incidentLink) {
	const res = await fetch(incidentLink)
	const data = await res.text()
	
	const root = parse(data);
	const title = root.querySelector(".incident-name").text.trim()
	const impact = root.querySelector(".incident-name").getAttribute("class").match(/impact\-(\w+)/)?.[1];
	const affectedComponents = root.querySelector(".components-affected")?.text?.trim()?.match(/This incident affect\w+: (.+)./)?.[1]?.split(", ") || [];
	const updates = root.querySelectorAll(".update-row").map(x => {
		return {
			status: x.querySelector(".update-title").text.trim(),
			description: x.querySelector(".update-body span").text.trim(),
			timestamp: new Date(parseInt(x.querySelector(".ago").getAttribute("data-datetime-unix")))
		}
	})

	return {
		title,
		impact,
		affectedComponents,
		updates,
		incidentLink
	}
}

const ImpactColors = {
	none: 0x000000,
	minor: 0xCB8615,
	major: 0xF26522,
	critical: 0xED4245,
	maintenance: 0x3498DB
}

async function ProcessIncident(data) {
	console.log("Processed incident", data.title)
	
	const embed = {
		title: data.title,
		url: data.incidentLink,
		color: ImpactColors[data.impact],
		fields: data.updates.map(x => {
			return {
				name: x.status,
				value: `<t:${Math.floor(x.timestamp.getTime()/1000)}:t> - ${x.description}`
			}
		}),
		footer: {
			text: `Affects: ${data.affectedComponents.join(", ")}`
		},
		timestamp: data.updates[data.updates.length-1].timestamp.toISOString()
	}

	try {
		await fetch(`https://discord.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
			method: "POST",
			body: JSON.stringify({
				embeds: [embed]
			}),
			headers: {
				"Content-Type": "application/json"
			}
		})
	} catch(ex) {
		console.error("Failed to send post", embed, "because", ex)
	}
}

async function main() {
	const res = await fetch("https://discordstatus.com/history.rss")
	const data = await res.text()

	const obj = new XMLParser().parse(data)
	const list = obj.rss.channel.item

	if(!lastData) {
		lastData = list[0]
		fs.writeFileSync("last.dat", JSON.stringify(lastData))
	}

	if(lastData.guid != list[0].guid || lastData.description != list[0].description) {
		const data = await GetIncidentInfo(list[0].guid)
		ProcessIncident(data)
	}

	lastData = list[0]
	fs.writeFileSync("last.dat", JSON.stringify(lastData))
}

main()
setInterval(main, 5 * 60 * 1000)