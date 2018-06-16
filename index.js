import axios from 'axios';
import csv from 'fast-csv';
import mongoose from 'mongoose';
import SpotifyWebApi from 'spotify-web-api-node';

mongoose.connect('mongodb://localhost/songs');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

const songInfoSchema = mongoose.Schema({
    duration: Number,
    tempo: Number,
    timeSignature: Number,
    mode: Number,
    key: Number,
    loudness: Number,
    danceability: Number,
    energy: Number
});

const songSchema = mongoose.Schema({
    id: String,
    track: String,
    artist: String,
    year: String,
    month: String,
    posThen: String,
    posHighest: String,
    songInfo: songInfoSchema
});

const SongInfoModel = mongoose.model('SongInfoModel', songInfoSchema);
const SongModel = mongoose.model('SongModel', songSchema);

const spotifyApi = new SpotifyWebApi({
  clientId : 'a1b12c8eb9e84009a4bf13477c312696',
  clientSecret : 'b2f77346a8a54302833904c54ffc8fef'
});

const makeRequest = async () => {
    await spotifyApi.
        clientCredentialsGrant()
        .then(async (data) => {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);
            const resp = await spotifyApi.setAccessToken(data.body['access_token']);
            return resp;
        }, function(err) {
            console.log('Something went wrong when retrieving an access token', err);
        });
}
const getSongInfo = (id) => {
    return spotifyApi.
        getAudioFeaturesForTrack(id).
        then((data) => {
            return data.body;
        }, (err) => {
            console.error(err);
            return err;
        });
}

const getSongId = async ({track, artist, year, posThen, posHighest, month}) => {
    let str = `track:${track} artist:${artist} year:${year}`;
    await spotifyApi.
        searchTracks(str, { limit: 1, offset: 0 })
        .then(async (data) => {
            if (data.body.tracks.items[0]) {
                const id = data.body.tracks.items[0].id;
                await getSongInfo(id).
                then(async (songInfoData) => {
                    const songInfo = new SongInfoModel({
                        duration: songInfoData.duration_ms,
                        tempo: songInfoData.tempo,
                        timeSignature: songInfoData.time_signature,
                        mode: songInfoData.mode,
                        key: songInfoData.key,
                        loudness: songInfoData.loudness,
                        danceability: songInfoData.danceability,
                        energy: songInfoData.energy
                    });
                    songInfo.save();
                    const song = new SongModel({
                        id,
                        track,
                        artist,
                        year,
                        month,
                        posThen,
                        posHighest,
                        songInfo
                    });
                    console.log(track);
                    await song.save();
                    return true;
                }).catch((err) => {
                    console.log(err);
                });
            }
        }, (err) => {
            console.error(err);
            return true;
        });
}
db.once('open', () => {
    makeRequest().
    then(() => {
        let csvstream = csv.fromPath('./SongData.csv', { headers: false })
        .on("data", function (line) {
            csvstream.pause();
            getSongId({
                artist: line[0],
                posThen: line[1],
                posHighest: line[2],
                track: line[3],
                month: line[4],
                year: line[5]
            }).then(() => {
                csvstream.resume();
            });
        })
        .on("end", function () {
            console.log("We are done!");
            db.close();
        })
        .on("error", function (error) {
            console.log(error)
        });
    });
});

