# Stable Platform Status
As we all know, Discord is a stable platform /j

This watches https://status.discord.com for updates and posts them to your Discord webhook with the following information:
* Title
* Updates (with timestamps)
* Impact color (none, minor, major, critical, maintenance)
* Affected components

It does a little HTML parsing in order to get info that the RSS feed endpoint doesn't provide, so it might break at some point.

# How to use
1. Install node.js
2. Download and unzip the project
3. Go to the unzipped folder and run `npm install`
4. Rename `.env.example` to `.env` and fill in the id and token of your webhook
5. Run `node index.js`

# Preview
![image](https://user-images.githubusercontent.com/9750071/229376165-a4ffe6b6-310f-4288-a2e0-1313c8d2ce98.png)
