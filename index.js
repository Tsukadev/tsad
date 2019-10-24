// "im tsu and im a cool nikka. Not a b*tch nikka."
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');
const fs = require('fs');

const { range, dbName } = require('./config.json');

const client = MongoClient.connect('mongodb://localhost:27017', {
	useNewUrlParser: true,
	useUnifiedTopology: true
}).catch(err => {
	throw err;
});

function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAndSaveChar(id) {
	const database = (await client).db(dbName);

	if ((await database.collection('characters').countDocuments({ _id: id })) === 1) {
		return [false, true];
	}

	console.log(`https://api.jikan.moe/v3/character/${id}`);

	let failed = false;
	const [char, images] = await Promise.all([
		fetch(`https://api.jikan.moe/v3/character/${id}`).then(res => res.json()),
		fetch(`https://api.jikan.moe/v3/character/${id}/pictures`).then(res => res.json())
	]).catch(() => {
		failed = true;
	});

	if (failed || !char || !images || !char.name) return [false, false];

	const newChar = {
		name: char.name,
		jp_name: char.name_kanji,
		nicknames: char.nicknames,
		url: char.url,
		mal_id: char.mal_id,
		_id: char.mal_id,
		animeography: char.animeography && char.animeography.map(i => i.mal_id),
		mangaography: char.mangaography && char.mangaography.map(i => i.mal_id),
		about: char.about
	};

	newChar.images = images.pictures && images.pictures.map(i => i.large || i.small);

	await database.collection('characters').insertOne(newChar);

	return [char.request_cached && images.request_cached, true];
}

function shuffle(array) {
	var currentIndex = array.length,
		temporaryValue,
		randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

async function t() {
	const has = require('./t');
	console.log(`Fetching from ${range[0]} to ${range[1]}`);
	const done = [];
	for (const id of shuffle(has.slice(range[0], range[1]))) {
		console.log(`fetching ${id}`);
		const [cached, successfull] = await fetchAndSaveChar(id);
		if (!cached) await sleep(1500);
		if (successfull) done.push(id);
		if (rand(1, 5) === 1) {
			fs.writeFileSync(
				'./t.json',
				JSON.stringify([...has].filter(num => !done.includes(num)))
			);
		}
	}
}

t();
