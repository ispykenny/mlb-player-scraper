const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const athletes = require("./athletes.json");
const TEAM_LIMIT = 31; // 30 teams with offset of 1
let count = 1; // offset (api starts at 1)

const Position = {
  Pitchers: "Pitchers",
  Outfielders: "Outfielders",
  Infielders: "Infielders",
  Catchers: "Catchers",
};

const fetchStats = async (players, teamInfo) => {
  players.forEach(async (player) => {
    const response = await axios(player.links[0].href);
    const html = await response.data;
    const $ = cheerio.load(html);
    const statsTable = $(".StatBlock__Content");
    const data = {};
    data.displayName = player.displayName;
    data.playerId = player.id;
    data.position = player.position.displayName;
    data.image = player?.headshot?.href;
    data.team = teamInfo.team;
    data.teamLogo = teamInfo.teamLogo;
    const values = statsTable.find(".StatBlockInner");

    if (data.position != Position.Pitchers) {
      values.each((i, el) => {
        const stat = $(el).find(".StatBlockInner__Label").text();
        const value = $(el).find(".StatBlockInner__Value").text();
        if (stat) {
          data[stat] = value;
        }
      });
    }

    athletes.athletes.push(data);
    fs.writeFileSync("athletes.json", JSON.stringify(athletes, null, 2));
  });
};

const fetchRoster = async () => {
  // nuke array and start over (for testing purposes only)
  if (count === 1) {
    // delete athletes.athletes from athletes.json
    athletes.athletes = [];
    fs.writeFileSync("athletes.json", JSON.stringify(athletes, null, 2));
  }

  const playersArr = [];
  const response = await axios(
    `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/${count}/roster`
  );
  const data = await response.data;
  const players = await data.athletes;
  const positionsToFetch = [
    Position.Pitchers,
    Position.Outfielders,
    Position.Infielders,
    Position.Catchers,
  ];

  players.map((player) => {
    if (positionsToFetch.includes(player.position)) {
      playersArr.push(...player.items);
    }
  });

  await fetchStats(playersArr, {
    team: data.team.displayName,
    teamLogo: data.team.logo,
  });

  count++;
  if (count <= TEAM_LIMIT) {
    console.log(
      "fetching players for ",
      data.team.displayName +
        " " +
        (count - 1) +
        ` (${playersArr.length} players)`
    );
    fetchRoster(count);
  }
};

//
function checkPlayerLength() {
  console.log(
    "Total amount of catchers, infielders, outfielders in MLB ",
    athletes.athletes.length
  );
}

fetchRoster();
// checkPlayerLength();
