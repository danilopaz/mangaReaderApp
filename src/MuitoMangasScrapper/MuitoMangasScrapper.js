const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require("puppeteer");
const { MongoClient } = require('mongodb');

const host2 = 'https://muitomanga.com';

const getMangaInfoMuitoMangas = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        'args': [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto(host2 + '/lista-de-mangas');
    let contentList = await page.$$eval(".content_post > .manga_r > div", (element) => {
        return element.map((div) => {
            const anchor = div.querySelector('a').getAttribute('href');
            const imgUrl = div.querySelector('a').querySelector('.content-thumb > img').getAttribute('data-src');
            const title = div.querySelector('a').querySelector('.data > .title').innerHTML;
            const mangaMetaData = {
                anchor: anchor,
                imgUrl: imgUrl,
                title: title,
                genres: null,
            }
            return mangaMetaData;
        });
    });
    browser.close();
    return contentList;
};

const getMangaDetailsMuitoMangas = (anchor) => {
    const mangaDetail = {};
    const urlRequest = host2 + anchor
    return axios.get(urlRequest)
        .then((res) => {
            const $ = cheerio.load(res.data);
            const author = $('div > .boxAnimeSobreLast').find('.series_autor2').text();
            const sinopse = $('div > .boxAnimeSobreLast').find('p').text();
            const chapters = [];
            $('.manga-chapters > .single-chapter').each((index, element) => {
                const chapterLink = $(element).find('a').first().attr('href');
                const chapterString = $(element).find('a').first().text();
                const chapterObject = {
                    chapterLink: chapterLink,
                    chapterString: chapterString
                }
                chapters.push(chapterObject);
            })
            mangaDetail.author = author;
            mangaDetail.sinopse = sinopse;
            mangaDetail.chapters = chapters;
            //    console.log(mangaDetail);
            return mangaDetail;
        })
        .catch(err => console.error(err))
}

const getMangaPageMuitoMangas = async (chapterLink) => {
    const urlRequest = host2 + chapterLink;
    let pagesUrl = [];
    const browser = await puppeteer.launch({
        headless: true,
        'args': [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto(urlRequest);
    let stop = false;

    const img = await page.$eval(".reader-area", (element) => {
        return element.querySelector('img').getAttribute('src');
    });
    pagesUrl.push(img);

    while (!stop) {
        await page.click('#chimagenext').then(async () => {
            let img = await page.$eval(".reader-area", (element) => {
                return element.querySelector('img').getAttribute('src');
            });
            if (img.startsWith('https://i1.wp.com'))
                img = img.slice(18)
            if (img === pagesUrl[pagesUrl.length - 1])
                throw 'Last Page'
            else {
                pagesUrl.push(img);
            }
        }).catch((err) => {
            stop = true;
        })
    }
    console.log(pagesUrl)
    browser.close();

    return pagesUrl
}

const searchMangaMuitoMangas = async (mangaName) => {
    const browser = await puppeteer.launch({
        headless: true,
        'args': [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto(host2 + '/buscar?q=' + mangaName);

    let contentList = await page.$$eval(".content_post > div", (element) => {
        return element.map((div) => {
            const anchor = div.querySelector('.anime > .boxAnimeSobreLast > h3 > a').getAttribute('href');
            const imgUrl = div.querySelector('.anime > .capaMangaBusca > a > img').getAttribute('src');
            const title = div.querySelector('.anime > .boxAnimeSobreLast > h3 > a').innerHTML;
            const mangaMetaData = {
                anchor: anchor,
                imgUrl: imgUrl,
                title: title,
                genres: null,
            }
            return mangaMetaData;
        });
    });
    browser.close();
    return contentList;
};

const getMangaInfoDetailsMuitoMangas = async () => {
    const client = new MongoClient("mongodb://localhost:27017/dansia-mangas");
    const database = client.db();
    try {
        await client.connect();
    } catch (e) {
        console.log('erro')
        console.error(e);
    }

    const browser = await puppeteer.launch({
        headless: true,
        'args': [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);
    await page.goto(host2 + '/lista-de-mangas', { waitUntil: 'domcontentloaded' });

    const dataList = [];

    let nextPage = 2;
    const urls = await page.evaluate(() => Array.from(document.querySelectorAll('.postagem_manga a'), element => element.href));
    let stop = false;

    while (!stop) {
        await page.waitForSelector(`#pg${nextPage}`)
            .then(async () => await page.click(`#pg${nextPage}`))
            .then(async () => {
                const pageUrls = await page.evaluate(() => Array.from(document.querySelectorAll('.postagem_manga a'), element => element.href));
                urls.push(...pageUrls);
                nextPage++;
            })
            .catch((err) => stop = true)
    }
    console.log(urls);

    for (let i = 0, total_urls = urls.length; i < total_urls; i++) {
        await page.goto(urls[i], { waitUntil: 'domcontentloaded' });

        const imgUrl = await page.$('.capitulo_recente .anime .capaMangaInfo a img');
        const imagemCapa = await page.evaluate(element => element.src, imgUrl);

        const authorElement = await page.$('div .boxAnimeSobreLast .series_autor2');
        const author = await page.evaluate(element => element.textContent, authorElement);

        const titleElement = await page.$('h1');
        const title = await page.evaluate(element => element.textContent, titleElement);

        const sinopseElement = await page.$('.boxAnimeSobreLast p');
        const sinopse = await page.evaluate(element => element.textContent, sinopseElement);

        let genres = await page.$$eval(".last-generos-series > li", (element) => {
            return element.map((li) => {
                const genre = li.querySelector('a').innerHTML
                return genre;
            });
        });

        let chapters = await page.$$eval(".manga-chapters > .single-chapter", (element) => {
            return element.map((el) => {
                try {
                    const chapterDate = el.querySelector('small').innerHTML;
                    const chapterLink = el.querySelector('a').getAttribute('href')
                    const chapterString = el.querySelector('a').innerHTML
                    const chapterObject = {
                        chapterDate: chapterDate,
                        chapterLink: chapterLink,
                        chapterString: chapterString
                    }
                    return chapterObject;
                }
                catch {
                    console.log('No chapters available!');
                    return {
                        chapterDate: 'Not available',
                        chapterLink: 'Not available',
                        chapterString: 'Not available'
                    };
                }
            });
        });

        chapters.forEach(chapter => {
            const newDate = new Date(formataStringData(chapter.chapterDate));
            chapter.chapterDate = newDate;
        })

        const data = {
            imgUrl: imagemCapa,
            author: author,
            source: 'muitomangas',
            title: title,
            sinopse: sinopse,
            status: 'nostatus',
            genres: genres,
            chapters: chapters
        }
        console.log(data)
        await database.collection("mangas")
            .insertOne(data)
            .then(result => {
                console.log(result.insertedId);
            })
            .catch(err => {
                console.log(err);
            });
        dataList.push(data);
    }

    browser.close();
    return dataList;
};

const formataStringData = (data) => {
    const dia = data.split("/")[0];
    const mes = data.split("/")[1];
    const ano = data.split("/")[2];

    return ano + '-' + ("0" + mes).slice(-2) + '-' + ("0" + dia).slice(-2);
}

module.exports = { getMangaDetailsMuitoMangas, getMangaPageMuitoMangas, getMangaInfoMuitoMangas, searchMangaMuitoMangas, getMangaInfoDetailsMuitoMangas };