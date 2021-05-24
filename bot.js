const {
  Client, MessageEmbed
} = require("discord.js");
const {DateTime} = require("luxon");
const client = new Client();
const crypto = require("crypto");
const gw2 = require("gw2");
const fs = require("fs-extra");


const {
  token,
  guild,
  discordToken,
  techAdminId,
  guildAdminId,
  skippedUser,
  channelName
} = require("./config");


let botID = null;
let displayMsg = null;
let displayMsgOld = null;

function shuffle(array) {
  let m = array.length;
  while (m) {
    const i = Math.floor(Math.random() * m--);
    const t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

(async() => {

  const gw2client = new gw2.Client();

  let lottoLines;
  let lottoInterval;
  let messageID;

  try {
    lottoLines = await fs.readJSON("./lotto-lines.json");
  } catch (error) {
    lottoLines = [];
  }
  try {

    lottoInterval = (await fs.readJSON("./lotto-interval.json")).interval;
  } catch (error) {
    lottoInterval = DateTime.local().toFormat("y-MM");
    await fs.outputJSON("./lotto-interval.json", {interval: lottoInterval});
  }
  try {
    messageID = (await fs.readJSON("./lotto-message-id.json")).id;
  } catch (error) {
    messageID = null;
    await fs.outputJSON("./lotto-message-id.json", {id: messageID});
  }


  function hashLog(file) {
    const hash = crypto.createHash("md5");
    hash.update(file);
    return hash.digest("hex");
  }

  function cashoutDate(date) {
    return date.startOf("month")
      .endOf("week")
      .set({
        hour: 21,
        minute: 0,
        second: 0
      });
  }

  function formatGold(coins) {
    const gold = Math.floor(coins / 10000);
    const silver = Math.floor((coins - (gold * 10000)) / 100);
    const copper = (coins - (gold * 10000) - (silver * 100));
    return `${gold || "0"}\u00A0:yellow_circle:\u00A0${(`${silver || "0"}`).padStart(2, "0")}\u00A0:white_circle:\u00A0${(`${copper || "0"}`).padStart(2, "0")}\u00A0:brown_circle:`;
  }

  function getUserTokens(lastDraw, nextDraw) {
    const tokens = {};
    let pot = 0;
    for (const line of lottoLines) {
      if (skippedUser.includes(line.user)) {
        continue;
      }
      const lineTime = DateTime.fromISO(line.time);
      if (lineTime >= lastDraw && lineTime < nextDraw) {
        const tokenForUser = Math.floor(line.coins / 10000);
        if (tokenForUser > 0) {
          tokens[line.user] = (tokens[line.user] || 0) + tokenForUser;
          pot += line.coins;
        }
      }
    }
    return {
      tokens,
      pot
    };
  }

  function getDisplay() {
    const now = DateTime.fromFormat(lottoInterval, "y-MM");
    const nextDraw = cashoutDate(now);
    const lastDraw = cashoutDate(nextDraw.minus({months: 1}));

    const {
      tokens, pot
    } = getUserTokens(lastDraw, nextDraw);

    const tokenUser = Object.entries(tokens);

    tokenUser.sort((a, b) => b[1] - a[1]);

    const ranksLabel = [
      "1. Platz: ",
      "2. Platz: ",
      "3. Platz: ",
      "Gildenbank: "
    ];
    const ranks = [
      `${formatGold(Math.floor(pot * 0.5))}`,
      `${formatGold(Math.floor(pot * 0.2))}`,
      `${formatGold(Math.floor(pot * 0.1))}`,
      `${formatGold(pot - Math.floor(pot * 0.5) - Math.floor(pot * 0.2) - Math.floor(pot * 0.1))}`
    ];

    const info = {
      color: "#002039",
      title: "Gildenlotterie",
      url: "https://sc.moep.tv/discussion/12/woechentliche-gildenlotterie",
      description: "1 Ticket kostet 1G",
      thumbnail: "https://wiki-de.guildwars2.com/images/d/da/Gilden-Schatzgrube_Icon.png",
      nextDraw: nextDraw.toFormat("dd.MM.y HH:mm") || "/",
      lastDraw: lastDraw.toFormat("dd.MM.y HH:mm") || "/",
      potSize: formatGold(pot) || "/",
      users: tokenUser.map(([
        name,
        tokenCount
      ]) => `${name}: ${tokenCount}`)
        .join("\n") || "/",
      ranks: `${ranks.join("\n")}` || "/",
      ranksLabel: `${ranksLabel.join("\n")}` || "/"
    };
    const displayMsgData = hashLog(JSON.stringify(info));

    return new MessageEmbed()
      .setColor(info.color)
      .setTitle(info.title)
      .setURL(info.url)
      .setDescription(info.description)
      .setThumbnail(info.thumbnail)
      .addFields(
        {
          name: "Nächste Ziehung",
          value: info.nextDraw
        },
        {
          name: "\u200B",
          value: "\u200B"
        },
        {
          name: "Aktueller Pot",
          value: info.potSize
        },
        {
          name: "Tickets",
          value: info.users
        },
        {
          name: "Platz",
          value: info.ranksLabel,
          inline: true
        },
        {
          name: "Preise",
          value: info.ranks,
          inline: true
        },
        {
          name: "Letze Ziehung",
          value: info.lastDraw
        }
      )
      .setTimestamp()
      .setFooter(displayMsgData);
  }


  function getDisplayResults(month, winner) {
    const now = DateTime.fromFormat(month, "y-MM");
    const nextDraw = cashoutDate(now);
    const lastDraw = cashoutDate(nextDraw.minus({months: 1}));

    const {
      tokens, pot
    } = getUserTokens(lastDraw, nextDraw);

    const tokenUser = Object.entries(tokens);

    tokenUser.sort((a, b) => b[1] - a[1]);

    const ranksLabel = [
      "1.",
      "2.",
      "3."
    ];
    const ranks = [
      `${formatGold(Math.floor(pot * 0.5))}`,
      `${formatGold(Math.floor(pot * 0.2))}`,
      `${formatGold(Math.floor(pot * 0.1))}`,
      `${formatGold(pot - Math.floor(pot * 0.5) - Math.floor(pot * 0.2) - Math.floor(pot * 0.1))}`
    ];

    const info = {
      color: "#002039",
      title: "Gildenlotterie",
      url: "https://sc.moep.tv/discussion/12/woechentliche-gildenlotterie",
      description: "Ergebnisse",
      thumbnail: "https://wiki-de.guildwars2.com/images/d/da/Gilden-Schatzgrube_Icon.png",
      nextDraw: nextDraw.toFormat("dd.MM.y HH:mm") || "/",
      lastDraw: lastDraw.toFormat("dd.MM.y HH:mm") || "/",
      potSize: formatGold(pot) || "/",
      users: tokenUser.map(([
        name,
        tokenCount
      ]) => `${name}: ${tokenCount}`)
        .join("\n") || "/",
      ranks: `${ranks.join("\n")}` || "/",
      ranksLabel: `${ranksLabel.join("\n")}` || "/",
      winner: `${winner.join("\n")}` || "/"
    };
    const displayMsgData = hashLog(JSON.stringify(info));

    return new MessageEmbed()
      .setColor(info.color)
      .setTitle(info.title)
      .setURL(info.url)
      .setDescription(info.description)
      .setThumbnail(info.thumbnail)
      .addFields(
        {
          name: "Ziehung",
          value: info.nextDraw
        },
        {
          name: "\u200B",
          value: "\u200B"
        },
        {
          name: "Pot",
          value: info.potSize
        },
        {
          name: "Pl.",
          value: info.ranksLabel,
          inline: true
        },
        {
          name: "Gewinner",
          value: info.winner,
          inline: true
        },
        {
          name: "Preise",
          value: info.ranks,
          inline: true
        }
      )
      .setTimestamp()
      .setFooter(displayMsgData);
  }


  client.on("ready", async() => {
    botID = client.user.id;
    console.info(`Logged in as ${client.user.tag}!`);
    const channel = client.channels.cache.find((c) => c.name === channelName);
    if (channel && messageID) {
      displayMsg = await channel.messages.fetch(messageID);
    }
    console.info(`displayMsg: ${!!displayMsg}`);
  });

  client.on("messageReactionAdd", async(reaction, user) => {
    if (!botID) {
      return;
    }
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message: ", error);
        return;
      }
    }
    if (!reaction.message || !reaction.message.embeds || reaction.message.embeds.length !== 1) {
      return;
    }
    const embed = reaction.message.embeds[0];
    if (embed.type !== "rich" || embed.title !== "Gildenlotterie") {
      return;
    }
    if (user.id !== botID) {
      await reaction.users.remove(user.id);
      //console.log(user);
    }

    if (user.id === guildAdminId || user.id === techAdminId) {
      displayMsgOld = displayMsg;
      const now = DateTime.fromFormat(lottoInterval, "y-MM");


      const nextDraw = cashoutDate(now);
      const lastDraw = cashoutDate(nextDraw.minus({months: 1}));
      if (nextDraw >= DateTime.local()) {
        return;
      }

      const {tokens} = getUserTokens(lastDraw, nextDraw);
      const tickets = [];
      for (const [
        user,
        ticketCount
      ] of Object.entries(tokens)) {
        for (let index = 0; index < ticketCount; index++) {
          tickets.push(user);
        }
      }

      shuffle(tickets);

      await fs.outputJSON(`./logs/${lottoInterval}.json`, tickets, {spaces: 2});

      const winner = [];

      winner[0] = tickets[0] || "/";
      winner[1] = tickets.find((t) => !winner.includes(t)) || "/";
      winner[2] = tickets.find((t) => !winner.includes(t)) || "/";
      winner[3] = "Gildenbank";


      await displayMsgOld.edit(getDisplayResults(lottoInterval, winner));
      await displayMsgOld.reactions.removeAll();
      lottoInterval = now.plus({months: 1}).toFormat("y-MM");
      await fs.outputJSON("./lotto-interval.json", {interval: lottoInterval});

      const newMsg = await displayMsgOld.channel.send(getDisplay());
      if (cashoutDate(DateTime.fromFormat(lottoInterval, "y-MM")) < DateTime.local().plus({hours: 2})) {
        await newMsg.react("✅");
      } else {
        await newMsg.react("⏳");
      }

      displayMsg = newMsg;
      await fs.outputJSON("./lotto-message-id.json", {id: displayMsg.id});

    }
    /*console.log({
      embed,
      user,
      botID
    });*/
  });

  client.on("message", async(msg) => {
    if (msg.content === "init" && msg.channel.name === channelName && msg.author.id === techAdminId) {
      const exampleEmbed = getDisplay();
      for (const oldMsg of await msg.channel.messages.fetch()) {
        await oldMsg[1].delete();
      }

      const newMsg = await msg.channel.send(exampleEmbed);
      if (cashoutDate(DateTime.fromFormat(lottoInterval, "y-MM")) < DateTime.local()) {
        await newMsg.react("✅");
      } else {
        await newMsg.react("⏳");
      }

      displayMsg = newMsg;
      await fs.outputJSON("./lotto-message-id.json", {id: displayMsg.id});

    }
  });

  async function updateDisplay() {
    if (!displayMsg) {
      return;
    }
    await displayMsg.fetch();
    const updateMsg = getDisplay();
    if (updateMsg && updateMsg.footer.text !== (displayMsg.embeds && displayMsg.embeds[0] && displayMsg.embeds[0].footer && displayMsg.embeds[0].footer.text)) {
      await displayMsg.edit(updateMsg);
    }
    const reactions = await displayMsg.reactions.resolve("⏳");
    if (reactions && reactions.count > 0 && cashoutDate(DateTime.fromFormat(lottoInterval, "y-MM")) < DateTime.local()) {
      await reactions.remove();
      await displayMsg.react("✅");
    }

  }

  async function refresh() {
    try {

      const lines = await gw2client.get(`guild/${guild}/log`, {token});

      for (const line of lines) {
        if (line.type !== "stash") {
          continue;
        }
        if (line.coins === 0) {
          continue;
        }
        if (lottoLines.find((l) => l.id === line.id)) {
          continue;
        }
        if (line.operation === "withdraw" && line.coins > 0) {
          line.coins *= -1;
        }
        lottoLines.push(line);
      }


      //console.log(lottoLines);

      lottoLines.sort((a, b) => a.id - b.id);

      await fs.outputJSON("./lotto-lines.json", lottoLines, {spaces: 2});
      await updateDisplay();
    } catch (error) {
      console.error(error);
    }
    setTimeout(refresh, 30000);
  }
  setTimeout(refresh, 10000);
  client.login(discordToken);
})().catch((err) => {
  console.error(err);
});
