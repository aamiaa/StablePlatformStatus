require("dotenv").config();

const fs = require("fs");
const axios = require("axios");
const {parse} = require("node-html-parser");
const {XMLParser, XMLBuilder} = require("fast-xml-parser");

let lastData;
if(fs.existsSync("last.dat"))
	lastData = JSON.parse(fs.readFileSync("last.dat").toString());

async function GetIncidentInfo(incidentLink) {
	let res = await axios.get(incidentLink);
	
	let root = parse(res.data);
	let title = root.querySelector(".incident-name").text.trim()
	let impact = root.querySelector(".incident-name").getAttribute("class").match(/impact\-(\w+)/)?.[1];
	let affectedComponents = root.querySelector(".components-affected")?.text?.trim()?.match(/This incident affect\w+: (.+)./)?.[1]?.split(", ") || [];
	let updates = root.querySelectorAll(".update-row").map(x => {
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
	
	let embed = {
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
		await axios.post(`https://discordapp.com/api/webhooks/${process.env.WEBHOOK_ID}/${process.env.WEBHOOK_TOKEN}`, {
			embeds: [embed]
		});
	} catch(ex) {
		console.error("Failed to send post", embed, "because", ex.response.data)
	}
}

async function main() {
	let res = await axios.get("https://discordstatus.com/history.rss")

	let obj = new XMLParser().parse(res.data)
	let list = obj.rss.channel.item

	if(!lastData) {
		lastData = list[0]
		fs.writeFileSync("last.dat", JSON.stringify(lastData))
	}

	if(lastData.guid != list[0].guid || lastData.description != list[0].description) {
		let data = await GetIncidentInfo(list[0].guid)
		ProcessIncident(data)
	}

	lastData = list[0]
	fs.writeFileSync("last.dat", JSON.stringify(lastData))
}

main()
setInterval(main, 5 * 60 * 1000)