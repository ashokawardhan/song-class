import axios from 'axios';
import mongoose from 'mongoose';
import fs from 'fs';
import mongooseToCsv from 'mongoose-to-csv';

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

songSchema.plugin(mongooseToCsv, {
  headers: 'id track artist artist month year posThen posHighest duration tempo timeSignature mode key loudness danceability energy',
  virtuals: {
    duration: (doc) => {
      return doc.songInfo.duration;
    },
    tempo: (doc) => {
      return doc.songInfo.tempo;
    },
    timeSignature: (doc) => {
      return doc.songInfo.timeSignature;
    },
    mode: (doc) => {
      return doc.songInfo.mode;
    },
    key: (doc) => {
      return doc.songInfo.key;
    },
    loudness: (doc) => {
      return doc.songInfo.loudness;
    },
    danceability: (doc) => {
      return doc.songInfo.danceability;
    },
    energy: (doc) => {
      return doc.songInfo.energy;
    }
  }
});

const SongInfoModel = mongoose.model('SongInfoModel', songInfoSchema);
const SongModel = mongoose.model('SongModel', songSchema);

SongModel.
    find({}).
    exec()
    .then((docs) => {
        SongModel.csvReadStream(docs)
            .pipe(fs.createWriteStream('songInfo.csv'));
    });
