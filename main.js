const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const getYoutubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const ffmpeg = require('ffmpeg');

const client = new Discord.Client({autoReconnect: true});
const discord_token = ""; // discord does not like me uploading my token on the web


// not sure what to use from this
let queue = [];
let isPlaying = false;
let dispatcher = null;
let voiceChannel = null;
let textChannel = null;
// /not sure what to use from this

client.login(discord_token);
client.on('disconnect', function(errMsg, code) {
	console.debug('----- Barry disconnected from Discord with code', code, ' for reason:', errMsg, '-----');
	client.connect();
});

client.on('error', console.error);
client.on('ready', handleReady.bind(this));
client.on('message', handleMessage.bind(this));

function handleReady() {
  console.log('I\'m ready')
}

function handleMessage(msg) {
  if (msg.author.bot) return; // don't react to yourself fool
  let txt = msg.content.toLowerCase();

	if (!txt.includes(' barry') && !txt.includes('barry ')) return; // This is not for me to read

  if (txt.includes('yo') || txt.includes('hey') || txt.includes('howdy')) {
    commandGreet(msg);
  }

  if ((txt.includes('zeg') && txt.includes('sorry')) || (txt.includes('verontschuldig'))) {
    commandApologise(msg);
    return;
  }

  if (txt.includes('hoe') && txt.includes('laat') && txt.includes('is')) {
    commandTime(new Date(), msg);
    return;
  }

  if (txt.includes('play') || txt.includes('speel') || txt.includes('afspelen')) {
		if (txt.includes('youtube.com')) {
      if (txt.includes('v=')) {
        textChannel = msg.channel;
        commandPlay(msg.member, msg);
        return;
      } else if (txt.includes('list=')) {
        textChannel = msg.channel;
        commandPlaylist(msg.member, msg);
        return;
      }
		} 
  }
  
  if (txt.includes('ophouden') || txt.includes('stoppen') || txt.includes('stop') || txt.includes('ga maar weg')) {
    commandLeave();
    commandApologise(msg);
  }

  if (txt.includes('skip') || txt.includes('volgende')) {

    if (queue.length > 1) {
      commandSkip();
    } else {
      commandLeave();
    }
    return;
  }

  if (txt.includes('pauze')) {
    commandPause();
    return;
  }
  if (txt.includes('doorgaan') || txt.includes('verder') || txt.includes('weer door')) {
    commandResume();
    return;
  }

  if (txt.includes('reset')) {
    commandReset();
  }
}




function commandApologise(msg) {
	let apologies = [
		'Sorry',
		'Het spijt me '+ msg.member.displayName.replace('@', ''),
		'Ging dit te ver '+ msg.member.displayName.replace('@', '') +'?',
		'Kon je het niet aan? '+ msg.member.displayName.replace('@', '') +'?'
	];

	let apology = apologies[Math.floor(Math.random() * apologies.length)];
	msg.channel.send(apology);
}

function commandGreet(msg) {
  msg.channel.send('Howdy partner 🤠');
}

function commandTime(date, msg) {
  if (date.getHours() > 15) {
    msg.channel.send('Doe maar 10 🍻 voor de jongens hier');
  } else {
    msg.channel.send('kijk zelf maar luie zak');
  }
}







// voice shit
function commandSkip() {
  if (queue.length > 0) {
    skipSong();
    textChannel.send("Op naar de volgende!");
  }
}

function commandResume() {
  if (dispatcher) {
    dispatcher.resume();
  }
}
function commandPause() {
  if (dispatcher) {
    dispatcher.pause();
  }
}

function commandVolume(msg) {
  var args = msg.toLowerCase().split(' ').slice(1).join(" ");
  var vol = parseInt(args);
  if (!isNaN(vol)
    && vol <= 100
    && vol >= 0) {
    dispatcher.setVolume(vol / 100.0);
  }
}


function commandPlay(member, msg) {
  console.debug(member.voice)
  if (!member.voice.channel) {
    msg.channel.send("Ga ff een voice channel in ofzo rakker.")
    return;
  }
  if (!voiceChannel) {
    voiceChannel = member.voice.channel;
  }
  var args = msg.content.split(' ').slice(1).join(" ");
  // var args = msg.toLowerCase().split(' ').slice(1).join(" ");
  args = reduceTrailingWhitespace(args);
  if (args.length != 0) playRequest(args);
}

function commandPlaylist(member, msg) {
  if (!member.voice.channel) {
    return;
  }
  if (!voiceChannel) {
    voiceChannel = member.voice.channel;
  }

  var args = msg;
  if (args.indexOf(prefix) == 0) {
    args = args.slice(1);
  }
  args = args.toLowerCase().split(' ');
  if (args[0] == 'play' && args[1] == 'list') {
    args = args.slice(2).join(" ");
  }
  else {
    args = args.slice(1).join(" ");
  }

  args = reduceTrailingWhitespace(args);
  if (args.length != 0) playlistRequest(args);
}

function commandLeave() {
  listening = false;
  queue = []
  if (dispatcher) {
    dispatcher.end();
  }
  dispatcher = null;
  
  if (voiceChannel) {
    voiceChannel.leave();
    voiceChannel = null;
  }
}


function commandReset() {
  if (queue.length > 0) {
    queue = [];
    if (dispatcher) {
      dispatcher.end();
    }
    textChannel.send("Afspeellijst leeggemaakt, vond je me niet goed zingen ofzo.");
  }
}


function skipSong() {
  if (dispatcher) {
    dispatcher.end();
  }
}

function playRequest(args) {
  if (queue.length > 0 || isPlaying) {
    getID(args, function (id) {
      if (id == null) {
        textChannel.send("Mongool stuur op z'n minst een werkende link");
      }
      else {
        add_to_queue(id);
        fetchVideoInfo(id, function(err, videoInfo) {
          if (err) throw new Error(err);
          textChannel.send("Toegevoegd aan het afspeellijstje **" + videoInfo.title + "**, is dat niet leuk :}");
        });
      }
    });
  }
  else {
    getID(args, function(id) {
      if (id == null) {
        textChannel.send("Mongool stuur op z'n minst een werkende link");
      }
      else {
        isPlaying = true;
        queue.push("placeholder");
        playMusic(id);
      }
    });
  }
}

function playlistRequest(args) {
  if (queue.length > 0 || isPlaying) {
    search_playlist(args, function(body) {
      if (!body) {
        textChannel.send("Dude, stuur op ff een werkende link, ik heb lettersoep uitgekakt dat nog duidelijker is dan jou.");
      }
      else {
        textChannel.send("Playlist voor '**" + args + "**' toegevoegd");
        json = JSON.parse(body);
        isPlaying = true;
        items = shuffle(json.items);
        items.forEach((item) => {
          add_to_queue(item.id.videoId);
        });
      }
    });
  }
  else {
    search_playlist(args, function(body) {
      if (!body) {
        textChannel.send("Gast ik wil je uitschelden, maar ik denk dat je ouders dat al vaak genoeg hebben gedaan.");
      }
      else {
        json = JSON.parse(body);
        isPlaying = true;
        items = shuffle(json.items);
        queue.push("placeholder");
        items.slice(1).forEach((item) => {
          add_to_queue(item.id.videoId);
        });
        playMusic(items[0].id.videoId);
      }
    });
  }
}

function playMusic(id) {

  voiceChannel.join().then(function(connection) {
    console.log("playing "+ id);
    stream = ytdl("https://www.youtube.com/watch?v=" + id, {
      filter: 'audioonly',
    });
    skipReq = 0;
    skippers = [];
    console.debug(connection);
		dispatcher = connection.play(stream, {volume: 0.3});
		
    fetchVideoInfo(id, function(err, videoInfo) {
      if (err) throw new Error(err);
      textChannel.send("Ik gaat ff  **" + videoInfo.title + "** spelen");
		});

		connection.on('error', console.error);
		
    dispatcher.on('end', function() {
      dispatcher = null;
      queue.shift();
      console.log("queue size: " + queue.length);
      if (queue.length === 0) {
        queue = [];
        isPlaying = false;
      }
      else {
        setTimeout(function() {
          playMusic(queue[0]);
        }, 2000);
      }
    })
  });
}

function isYoutube(str) {
  return str.toLowerCase().indexOf("youtube.com") > -1;
}

function getID(str, cb) {
  if (isYoutube(str)) {
    cb(getYoutubeID(str));
  }
  else {
    search_video(str, function(id) {
      cb(id);
    });
  }
}

function add_to_queue(strID) {
  if (isYoutube(strID)) {
    queue.push(getYoutubeID(strID));
  }
  else {
    queue.push(strID);
  }
}

function search_video(query, callback) {
  request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + YT_API_KEY, function(error, response, body) {
    var json = JSON.parse(body);

    if (json.items[0] == null) {
      callback(null);
    }
    else {
      callback(json.items[0].id.videoId);
    }
  });
}

function search_playlist(query, callback) {
	var maxResults = 40
	// Deze link geeft bijv. wel een result
	// https://www.googleapis.com/youtube/v3/search?part=id&type=video&id=PLkJUhcQ21zQErecouiv6VJKsfp3_dS346&key=AIzaSyDNhtqfdYgOAM8tTiNSAcUWv3cFAkrN5u8

  request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + YT_API_KEY + "&maxResults=" + 40, function(error, response, body) {
    var json = JSON.parse(body);

    if (json.items[0] == null) {
      callback(null);
    }
    else {
      callback(body);
    }
  });
}




// THE FUCK IS THIS
function reduceTrailingWhitespace(string) {
  for (var i = string.length - 1; i >= 0; i--) {
    if (string.charAt(i) == ' ') string = string.slice(0, i);
    else return string;
  }
  return string;
}