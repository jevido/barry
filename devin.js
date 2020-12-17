const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const ffmpeg = require('ffmpeg'); // Must be defined, or else some broken ass, shit will load
const fetch = require('node-fetch');
// import * as yt from 'youtube-search-without-api-key';

const client = new Discord.Client({autoReconnect: true});
// BARRY
// const discord_token = "";
// DEVIN
const discord_token = ""; // note: discord does not like me uploading my token on the web

let Barry = function() {
  this.intents = {
    'greeting': ['Gaat die lekker dan gaste', 'Sup nerd, herriner je me nog, het is Barry van de middelbare'],
    'apologise': ['Ging dit te ver [name]?', 'Kon je het niet aan?'],
    'insult': ['Als je zo gaat praten, gaat zelfs je moeder je onterfen', 'Gast ik wil je uitschelden, maar ik denk dat je ouders dat al vaak genoeg hebben gedaan.'],
    'confused': ['Ik heb lettersoep uitgekakt dat nog duidelijker is dan jou.'],
    'thanks': ['Geen probleem makker', 'ja tuurlijk jong', 'doen we toch niet moeilijk over', 'nee jij bedankt', 'de tering zit je me voor te bedanken dan', 'zit je nou te flirten met me, wie denk je wel niet dat je bent, Frans Bauer']
  };
  this.queue = [];
	this.playing = false;
	this.searchResults = [];
}

// Barry become human
Barry.prototype.listen = async function(msg) {
  if (msg.author.bot) return; // don't react to yourself fool
  let text = msg.content.toLowerCase();

  if (text == 'goed gedaan') {
    // buurman & buurman gif
    msg.channel.send('*GOED GEDAAN!*', {
      files: [ './assets/goed_gedaan.gif' ]
    });
	}
	
	// Don't need to say barry for this, but it does need to have searchResults, to be able to activate
	if (this.searchResults.length > 0) {
		this.playFromSearchResults(msg);
	}


  if (!text.includes(' devin') && !text.includes('devin ')) return;
	this.lastMessage = msg;

  if ((text.includes('bied') && text.includes('excuses')) || text.includes('verontschuldig') || (text.includes('zeg') && text.includes('sorry'))) {
    return msg.channel.send(this.speak('apologise'));
  }

  if (text.includes('hoe') && text.includes('laat') && text.includes('is')) {
		this.commandTime(msg);
		return;
    // return msg.channel.send(this.commandTime(new Date()));
  }

  if (text.includes('dank') && text.includes('je') || text.includes('thanks') || text.includes('bedankt')) {
    return msg.channel.send(this.speak('thanks'));
  }

  if (text.includes('hol') || text.includes('hou') && text.includes('bek')) {
    return msg.channel.send(this.speak('insult'));
  }

	// Music shit
	
  if (text.includes('queue') || text.includes('keu') || text.includes('speel') || text.includes('afspelen')) {
		// speel muziek af
		let data = await this.addSongToQueue(msg.content);
		if (!this.playing) {
			this.playAudio(data);
		}

    return;
	}
	





	// SEARCH SHIT
	if (text.includes('zoek')) {
		return this.youtubeSearch(msg);
	}
	// /SEARCH SHIT


  if (text.includes('pause') || text.includes('stop')) {
    return this.pauseAudio();
  }
  if (text.includes('door')) {
    return this.resumeAudio();
  }
  if (text.includes('kappe nou')) {
    return this.stopAudio();
  }
  if (text.includes('skip') || text.includes('volgende')) {
    if (this.queue.length > 0) {
      this.playAudio(this.queue[0]);
    } else {
      msg.channel.send('Je hebt niks in de keu staan maat');
    }
    return;
	}
  // /Music shit

  if (text.includes('yo') || text.includes('hey') || text.includes('howdy')) {
    return msg.channel.send(this.speak('greeting'));
  }
}

// returns a text not actually sends a text
Barry.prototype.speak = function(intent) {
  let text = this.intents[intent][Math.floor(Math.random() * this.intents[intent].length)];
  return text.replace('[name]', this.lastMessage.author.username);
}

Barry.prototype.ready = function() {
	console.debug('we live boys');  
}

Barry.prototype.setActivity = function(status) {
  client.user.setActivity(status);
}

Barry.prototype.commandTime = function() {
	let text = 'Kijk zelf maar luie zak';
	let file = './assets/StanBierNee.jpg'
	if (new Date().getHours() >= 15) {
		text = 'Doe maar 10 🍺 voor de jongens hier';
		file = './assets/StanBierJa.jpg';
	}

	msg.channel.send(text, {
		files: [file]
	});
	
	return;
}

Barry.prototype.getPixelDrainUrl = function(text) {
	let splitten = text.split(/\s+/);
	
	for (let word of splitten) {
		if (word.includes('pixeldrain')) {
			word = word.replace('pixeldrain.com/u', 'pixeldrain.com/api/file');
			return word;
		}
	}
	return false;
}


// Audio shit
Barry.prototype.stopAudio = function() {
  currentConnection.disconnect();
  this.playing = false;
  this.setActivity('');
}
Barry.prototype.pauseAudio = function() {
  dispatcher.pause();
}
Barry.prototype.resumeAudio = function() {
  dispatcher.resume();
}
Barry.prototype.addSongToQueue = async function(text) {
	let data;

	if (text.includes('pixeldrain')) {
		// Get youtube id'
		let allowedStreams = 'audio/mpeg,audio/mp3';
		let pixelDrainApi = this.getPixelDrainUrl(text);
			
		if (text.includes('pixeldrain.com/u/')) {
			await fetch(pixelDrainApi+ '/info').then((response) => response.json()).then((response) => {
				let name = response.name;

				if (allowedStreams.includes(response.mime_type)) {
					data = {
						title: name,
						url: pixelDrainApi,
						type: 'pixeldrain'
					};
				}
			});
		}
		
	} else {
		data = await this.getYoutubeDataFromString(text)
		if (!data) {
			this.lastMessage.channel.send('Mongool, stuur op z\'n minst een werkende link');
		}
	}

  // Display message that it has been added to the queue, only if we are playing atm
  // Otherwise we will auto-play
  if (this.playing) {
    this.lastMessage.channel.send(`Heb ${data.title} toegevoegd aan de keu`)
  }

	if (data) {
		this.queue.push(data);
		return data;
	} 
  

  return false;
}

Barry.prototype.playPixelDrain = async function(pixelDrainData) {
	let voiceChannel = this.lastMessage.member.voice.channel;
	if (!voiceChannel) {
		return this.lastMessage.channel.send('Ga ff een voice channel in ofzo rakker');
	}
	this.queue.shift(); // Remove current song from queue

	voiceChannel.join().then((connection) => {
		this.playing = true;
		currentConnection = connection;

		connection.on('error', console.error);

		dispatcher = connection.play(pixelDrainData.url, { volume: 1 });
		dispatcher.on('finish', () => {
			dispatcher.destroy();
			if (this.queue.length > 0) {
				this.playAudio(this.queue[0]);
			} else {
				this.stopAudio();
			}
		});
	});
}

Barry.prototype.playAudio = async function(data) {
	this.setActivity(data.title); // Name of the song
	this.queue.shift(); // Remove current song from queue

	switch (data.type) {
		case 'pixeldrain':
			this.playPixelDrain(data);
		break;
		case 'youtube':
			this.playYoutube(data);
		break;
	} 

}


Barry.prototype.playYoutube = async function(youtubeData) {
  // Join active voice channel
  let voiceChannel = this.lastMessage.member.voice.channel;
  if (!voiceChannel) {
    return this.lastMessage.channel.send('Ga ff een voice channel in ofzo rakker');
  }

	this.queue.shift(); // Remove current song from queue
	let youtubeURL;
	if (youtubeData.id) {
		 youtubeURL = `https://www.youtube.com/watch?v=${youtubeData.id}`;
	} else {
		youtubeURL = youtubeData.url;
	}
	
  voiceChannel.join().then((connection) => {
    this.playing = true;
    currentConnection = connection;
    let stream = ytdl(youtubeURL, {
      type: 'opus',
      filter: 'audioonly',
      liveBuffer: '20000', // default is 20000
      highWaterMark: 1024*1024*6 // default is 512KB
    });

    connection.on('error', console.error);

    dispatcher = connection.play(stream, { volume: 0.3 });
    dispatcher.on('finish', () => {      
      dispatcher.destroy();
      if (this.queue.length > 0) {
        this.playAudio(this.queue[0]);
      } else {
        this.stopAudio();
      }
    });
  });
}

Barry.prototype.getYoutubeDataFromString = async function(text) {
  if (!text.includes('youtube.com') && !text.includes('youtu.be')) return false;
  let words = text.split(' ');

  for (let word of words) {
    if (word.includes('youtube.com') || word.includes('youtu.be')) {
      let youtubeData = await ytdl.getBasicInfo(word);
      return {
        'id': youtubeData.video_id,
				'title': youtubeData.title,
				'type': 'youtube'
      };
    }
  }
  
  return false;
}
// /Audio shit

Barry.prototype.playFromSearchResults = async function(message) {
	let digit = getFirstDigitFromString(message.content);
	
	if (!digit) {
		return message.channel.send('Geen idee welk nummer je bedoelt man');
	}

	if (this.searchResults.length == 0) {
		return message.channel.send('Maat, ik heb zo geen idee meer waar je op zocht');
	}
	
	digit = (digit*1)-1; // When saving it starts from 0, but we humans start from 1
	let video = this.searchResults[digit];

	let data = {
		url: video.url,
		title: video.title,
		type: 'youtube'
	};
	this.queue.push(data);
	
	if (!this.playing) {
		this.playAudio(data);
	}
	this.searchResults = [];
	return;
}

Barry.prototype.youtubeSearch = async function(message) {
	let searchQuery = getTextBetweenQuotes(message.content);
	let options = {
		limit: 10,
		type: 'video'
	}
	let searchResult = await ytsr(searchQuery, options);
	let videos = searchResult.items;
	this.searchResults = [];


	for (let index in videos) {
		if (this.searchResults.length < 10 && videos[index].type == 'video') {
			this.searchResults.push({
				title: videos[index].title,
				url: videos[index].link,
				type: 'youtube'
			});
		}
	}

	videos = this.searchResults;
	if (videos.length == 0) {
		message.channel.send('Sorry gast, kan der niks voor vinden');
		return;
	}

	// Set a timeout to clear the searchresults at 5 minutes
	// setTimeout(() => {
	// 	this.searchResults = [];
	// }, 300000);

	let embed = new Discord.MessageEmbed()
		.setColor('#ff0099')
		.setDescription(`**--- ${searchQuery} ---**\n${videos.map((video, index) => 
				`**${++index} -** ${video.title}`).join('\n')}\n\n🎵 Zeg maar welk getal je wil tussen **1** and **${videos.length}**`);
	message.channel.send(embed);
}


let barry = new Barry();

client.on('disconnect', function(errMsg, code) {
  console.debug('----- Barry disconnected from Discord with code', code, ' for reason:', errMsg, '-----');
  client.connect(); // auto reconnect tryout
});

client.on('error', console.error);
client.on('ready', () => { barry.ready() });
client.on('message', message => barry.listen(message));
client.on('guildMemberAdd', member => {
  // Nasty fucking way to find a channel, but it's k
  const channel = member.guild.channels.cache.find(ch => ch.name == 'general');
  if (!channel) return;

  channel.send(`howdy ${member} `, {
    tts: true
  })
})


// Last but kind of importanté, log barry in to the mainframe
client.login(discord_token);

function getTextBetweenQuotes(text) {
	return text.match(/(?:"[^"]*"|^[^"]*$)/)[0].replace(/"/g, "");
}
function getFirstDigitFromString(text) {
	return text[text.search(/\d/)]; // replace all leading non-digits with nothing
}