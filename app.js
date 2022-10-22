const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const port = process.env.PORT || 5000
app.use(express.json())
app.use(express.static(__dirname + '/client/build'));

const { getMangaInfoMuitoMangas, getMangaDetailsMuitoMangas, getMangaPageMuitoMangas, searchMangaMuitoMangas, getMangaInfoDetailsMuitoMangas } = require('./src/MuitoMangasScrapper/MuitoMangasScrapper');

app.get('/', async (req, res) => {
  getMangaInfoMuitoMangas()
    .then((resp) => res.json(resp));
  /* getMangaInfoDetailsMuitoMangas()
     .then((resp) => res.json(resp));*/
})

app.get('/teste', (req, res) => {
  getMangaDetailsMuitoMangas(req.query.anchor)
    .then((resp) => res.json(resp));
})

app.get('/read', (req, res) => {
  console.log(req.query.page);
  getMangaPageMuitoMangas(req.query.page)
    .then((resp) => res.json(resp));
})

app.get('/search', (req, res) => {
  searchMangaMuitoMangas(req.query.name)
    .then((resp) => res.json(resp));
})

app.get('/getAllMangas', async (req, res) => {
  const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
  const database = client.db();
  const skipNumber = (51 * parseInt(req.query.num));
  try {
    client.connect()
      .then(() => database.collection("mangas").find().limit(51).skip(skipNumber))
      .then(async (result) => res.json(await result.toArray()))
      .then(() => client.close())
  } catch (e) {
    console.error(e);
  }
})

app.get('/getLatestMangas', async (req, res) => {
  const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
  const database = client.db();
  const skipNumber = (51 * parseInt(req.query.num));
  try {
    client.connect()
      .then(() => database.collection("mangas").find({ 'chapters.chapterDate': { $gt: new Date(new Date().setDate(new Date().getDate() - 7)) } }).limit(51).skip(skipNumber))
      .then(async (result) => res.json(await result.toArray()))
      .then(() => client.close())
  } catch (e) {
    console.error(e);
  }
})

app.get('/searchMangas', async (req, res) => {
  const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
  const database = client.db();
  const skipNumber = (51 * parseInt(req.query.num));
  const searchString = req.query.name;
  try {
    client.connect()
      .then(() => {
        return database.collection("mangas").find({ title: { $regex: searchString, $options: 'i' } }).limit(51).skip(skipNumber);
      })
      .then(async (result) => res.json(await result.toArray()))
      .then(() => client.close())
  } catch (e) {
    console.error(e);
  }
})
/*
app.get('/categories', async (req, res) => {
  const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
  const database = client.db();
  const categorias = [];
  try {
    client.connect()
      .then(() => {
        return database.collection("mangas").find({}).project({ genres: 1, _id: 0 });
      })
      .then(async (result) => await result.toArray())
      .then((resp) => resp.map(item => item.genres).map(item => item.map(arr => categorias.push(arr))))
      .then(() => categorias.map(item => item.trim().toLowerCase()))
      .then((resp) => console.log([...new Set(resp)]))
      .then(() => client.close())
  } catch (e) {
    console.error(e);
  }
})*/

app.get('/filterByCategory', async (req, res) => {
  const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
  const database = client.db();
  const skipNumber = (51 * parseInt(req.query.num));
  try {
    client.connect()
      .then(() => database.collection("mangas").find().limit(51).skip(skipNumber))
      .then(async (result) => res.json(await result.toArray()))
      .then(() => client.close())
  } catch (e) {
    console.error(e);
  }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})