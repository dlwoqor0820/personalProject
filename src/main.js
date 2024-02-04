import WebTorrent from 'webtorrent';
import fs from "fs";
import ffmpegPath from "ffmpeg-static";
import { exec } from "child_process";
import axios from 'axios';
import cheerio from 'cheerio';
import { title } from 'process';
import fetch from 'node-fetch'

/*const client = new WebTorrent();
const searchCommand = '[ASW] Sousou no Frieren';
const uploaderIndex = searchCommand.indexOf(']');
const uploader = searchCommand.slice(0, uploaderIndex + 1);
const searchTitle = searchCommand.slice(uploaderIndex + 2, searchCommand.length);
const encodedURI = encodeURI(searchCommand)
const nyaaURL = `https://nyaa.si/?q=${encodedURI}`
//console.log(nyaaURL)


const nyaaCrawler = async () => {
    try {
        let cutted = 0;
        let crawledList = [];
        let titleList = [];
        let titleJson = [];
        const html = await axios.get(nyaaURL);
        const $ = cheerio.load(html.data)
        const $animeList = $('body > div > div.table-responsive > table > tbody > tr')
        $animeList.each(function (i) {
            let title = $(this).find(`td:nth-child(2) > a:nth-child(2)`).text().trim();
            let isCommented = 1;
            if (title == '') {
                isCommented = 1;
            } else {
                isCommented = 2;
            };

            title = $(this).find(`td:nth-child(2) > a:nth-child(${isCommented})`).text().trim();
            let magnet = $(this).find(`td:nth-child(3) > a:nth-child(2)`).attr('href')

            if (title.search('1080') == -1 || title.search('HEVC') == -1) {
                cutted += 1
                return console.log(`${i + 1}번째 항목 화질구지 컷!`)
            } else {
                crawledList[i - cutted] = {
                    title: title,
                    magnet: magnet
                };
                titleList.push(crawledList[i - cutted].title);
            };
        });

        let rotate = 0;
        titleList.forEach(eachTitle => {
            const startIndex = eachTitle.search(searchTitle) + searchTitle.length + 3
            const slice = eachTitle.slice(startIndex);
            const extractIndex = slice.indexOf('[')
            const episodeNum = slice.slice(0, extractIndex - 1)
            titleJson[rotate] = {
                uploader: uploader,
                title: searchTitle,
                episodeNum: episodeNum
            }
            rotate += 1
        })

        fs.writeFileSync(`${__dirname}/public/${searchCommand}.json`, JSON.stringify(titleJson));
        for (let i = 0; i < crawledList.length; i++) {
            let magnetURI = crawledList[i].magnet
            await torrentDownloader(magnetURI)
        }
        console.log(titleJson)
    } catch (err) {
        console.log(err);
    };
};



const torrentDownloader = async (magnetURI) => {
    //console.log(magnetURI)
    let written = 0;
    let percentage = '0.00';
    //let fileName = new Date().getTime();
    client.add(magnetURI, torrent => {
        const files = torrent.files
        let length = files.length
        // Stream each file to the disk
        files.forEach(file => {
            const source = file.createReadStream()
            const destination = fs.createWriteStream(`${__dirname}/public/${file.name}`)
            source.on('data', (data) => {
                console.log(`Progressing ${file.name} + | ${percentage}% | ${(written / 1000000).toFixed(2)}Mb/${(file.length / 1000000).toFixed(2)}Mb`);
                percentage = (written / file.length * 100).toFixed(2);
                written += data.length
            })
                .on('end', () => {
                    console.log(`Progressing ${file.name} + | 100.00% | ${(file.length / 1000000).toFixed(2)}Mb/${(file.length / 1000000).toFixed(2)}Mb`)
                    console.log('File Title: ', file.name)
                    // close after all files are saved
                    length -= 1
                    if (!length) {
                        console.log("done!")
                        console.log(`Saved Directory : ${__dirname}/public/`)
                        const command = `${ffmpegPath} -i ${__dirname}/public/${file.name} -c:v copy -c:a copy -tag:v hvc1 ${__dirname}/public`;
                        exec(command, (error) => {
                            console.log(command);
                            if (!error) return;
                            console.log(error);
                        });
                    };
                }).pipe(destination);
        });
    });
};*/
let searchTitle = 'Sousou no frieren'
const Authorization = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYzg5MjVlOWRkZTUxMThjM2EwN2Q1YWI4NDYyYTkwZCIsInN1YiI6IjYxYjIzNGI1Njk5ZmI3MDAxY2VjN2NhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.hd1Yi8zoVB0RM411gBVFoPZVaeHN9T-BxvfkuQ0BY54'



const tmdb = async () => {
    //209867
    //overview, poster_path, name, backdrop_path${searchTitle}
    const encodedSearchTitle = encodeURI(searchTitle)
    const searchUrl = `https://api.themoviedb.org/3/search/tv?query=${encodedSearchTitle}&include_adult=false&language=ko-KR&page=1`;
    const searchOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        Authorization: Authorization
      }
    };
    
    const seriesIdData = await( await fetch(searchUrl, searchOptions)).json()
    const seriesID = seriesIdData.results[0].id

    const episodeUrl = `https://api.themoviedb.org/3/tv/${seriesID}/season/1?language=ko-KR`;
    const episodeOptions = {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYzg5MjVlOWRkZTUxMThjM2EwN2Q1YWI4NDYyYTkwZCIsInN1YiI6IjYxYjIzNGI1Njk5ZmI3MDAxY2VjN2NhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.hd1Yi8zoVB0RM411gBVFoPZVaeHN9T-BxvfkuQ0BY54'
        }
    };
    let rotate = 0;
    let episodesDetail = []
    const episodeData = await( await fetch(episodeUrl, episodeOptions)).json();
    //console.log(episodeData.episodes);
    while (episodeData.episodes[rotate].overview !== '') {
        let episodesDetailBox = {
            episodeNumber : episodeData.episodes[rotate].episode_number,
            runtime : episodeData.episodes[rotate].runtime,
            seasonId : episodeData.episodes[rotate].season_number,
            overview : episodeData.episodes[rotate].overview,
            smi : null,
            thumnail : `https://api.themoviedb.org${episodeData.episodes[rotate].still_path}`,
            episodeTitle : episodeData.episodes[rotate].name,

        }
        episodesDetail.push(episodesDetailBox)
        rotate += 1
    }
    console.log(episodesDetail)
};

tmdb();

//nyaaCrawler();
