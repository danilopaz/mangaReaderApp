const axios = require('axios');
const cheerio = require('cheerio');

const host = 'https://mangalivre.net';
const getMangaInfo = () => {
    const mangasInfo = [];
    return axios.get(host + '/lista-de-mangas')
        .then(res => {
            const $ = cheerio.load(res.data)
            $('div > .seriesList > li').each((index, element) => {
                const anchor = $(element).find('a').attr('href');
                let imgUrl = $(element).find('.series-img > .cover-image').attr('style');
                const title = $(element).find('.series-title > h1').text();
                const genres = [];
                $(element).find('.nota').each((index, element) => {
                    genres.push($(element).text())
                })
                imgUrl = imgUrl.slice(23, imgUrl.length - 3)
                const mangaMetaData = {
                    anchor: anchor,
                    imgUrl: imgUrl,
                    title: title,
                    genres: genres,
                }
                //  console.log(mangaMetaData);
                mangasInfo.push(mangaMetaData);
            })
            return mangasInfo;
        })
        .catch(err => console.error(err))
}

const getMangaDetails = (anchor) => {
    const mangaDetail = {};
    return axios.get(host + anchor)
        .then((res) => {
            const $ = cheerio.load(res.data);
            const author = $('.series-info').find('.series-author').text();
            const sinopse = $('.series-info > .series-desc').find('span').text();
            mangaDetail = {
                author,
                sinopse
            }
            console.log(mangaDetail);
            return mangaDetail;
        })
        .catch(err => console.error(err))
}

module.exports = { getMangaInfo, getMangaDetails }