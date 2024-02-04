import WebTorrent from "webtorrent";
import fs from "fs";
import ffmpegPath from "ffmpeg-static";
import { exec } from "child_process";
import axios from "axios";
import cheerio from "cheerio";
import { title } from "process";
import fetch from "node-fetch";

const Authorization =
  "Bearer eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJiYzg5MjVlOWRkZTUxMThjM2EwN2Q1YWI4NDYyYTkwZCIsInN1YiI6IjYxYjIzNGI1Njk5ZmI3MDAxY2VjN2NhNiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.hd1Yi8zoVB0RM411gBVFoPZVaeHN9T-BxvfkuQ0BY54";

const client = new WebTorrent();
//[ASW] Saikyou Tank no Meikyuu Kouryaku
//[ASW] Sousou no Frieren
//조건 :
// -tmDB에서 자체 누락 또는 회차 별 description이 누락되지 않을 것.
// -' [업로더] 제목 ' 형식을 반드시 맞출 것
// -season1, 2같은 부가적인 제목이 달려있지 않을 것
//  ㄴnyaaTorrent에서 검색은 되나 tmDB에서 검색 오류.
const searchCommand = "[ASW] Saikyou Tank no Meikyuu Kouryaku";
const uploaderIndex = searchCommand.indexOf("]");
const uploader = searchCommand.slice(0, uploaderIndex + 1);
const searchTitle = searchCommand.slice(
  uploaderIndex + 2,
  searchCommand.length
);
const encodedURI = encodeURI(searchCommand);
const nyaaURL = `https://nyaa.si/?q=${encodedURI}`;

const tmdb = async () => {
  const encodedSearchTitle = encodeURI(searchTitle);
  const searchUrl = `https://api.themoviedb.org/3/search/tv?query=${encodedSearchTitle}&include_adult=false&language=ko-KR&page=1`;
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: Authorization,
    },
  };
  const seriesIdData = await (await fetch(searchUrl, options)).json();
  const seriesID = seriesIdData.results[0].id;
  const episodeUrl = `https://api.themoviedb.org/3/tv/${seriesID}/season/1?language=ko-KR`;
  const episodeData = await (await fetch(episodeUrl, options)).json();
  let rotate = 0;
  let episodesDetail = [];
  while (episodeData.episodes[rotate].overview !== "") {
    let episodesDetailBox = {
      episodeNumber: episodeData.episodes[rotate].episode_number,
      runtime: episodeData.episodes[rotate].runtime,
      seasonId: episodeData.episodes[rotate].season_number,
      overview: episodeData.episodes[rotate].overview,
      smi: null,
      thumbnail: episodeData.episodes[rotate].still_path,
      episodeTitle: episodeData.episodes[rotate].name,
      videoId: new Date().getTime() + rotate,
    };
    episodesDetail.push(episodesDetailBox);
    rotate += 1;
  }
  try {
    const downloadedList = fs.readFileSync(`src/public/${searchCommand}.json`);
    console.log("update");
    checkDuplication(downloadedList, episodesDetail);
  } catch (err) {
    //const downloadedList = "";
    console.log("build new");
    nyaaCrawler(episodesDetail);
  }
};

const checkDuplication = (downloadedList, episodesDetail) => {
  let episodeNumList = [];
  let needDownloadEpisode = [];

  for (let data of episodesDetail) {
    episodeNumList.push(data.episodeNumber);
  }

  const tmdbMaxEpisode = Math.max(...episodeNumList);

  const JSONdownloadedList = JSON.parse(downloadedList);
  episodeNumList = [];
  for (let data of JSONdownloadedList) {
    episodeNumList.push(data.episodeNumber);
  }
  const downloadedMaxEpisode = Math.max(...episodeNumList);

  let difference = tmdbMaxEpisode - downloadedMaxEpisode;
  if (difference < 0) difference = 0; //리스트 무한 추가 버그 방지
  for (let i = 0; i < difference; i++) {
    needDownloadEpisode.push(tmdbMaxEpisode - i);
  }
  //console.log(episodesDetail);
  //없데이트 시 종료
  if (difference == 0) return console.log("새로운 업데이트 없음");

  let filterdEpisodesDetail = episodesDetail.filter((data) => {
    for (let i = 0; i < needDownloadEpisode.length; i++) {
      if (data.episodeNumber == needDownloadEpisode[i]) {
        return data;
      }
    }
  });
  nyaaCrawler(filterdEpisodesDetail, JSONdownloadedList);
};

const nyaaCrawler = async (downloadList, downloadedList) => {
  console.log("nyaaCrawler is working");
  //console.log(downloadedList);
  let titleList = [];
  const html = await axios.get(nyaaURL);
  const $ = cheerio.load(html.data);
  const $animeList = $(
    "body > div > div.table-responsive > table > tbody > tr"
  );
  $animeList.each(function (i) {
    let isCutted = true;
    let title = $(this).find(`td:nth-child(2) > a:nth-child(2)`).text().trim();
    let isCommented = 1;
    isCommented = title == "" ? (isCommented = 1) : (isCommented = 2);
    title = $(this)
      .find(`td:nth-child(2) > a:nth-child(${isCommented})`)
      .text()
      .trim();
    let magnet = $(this).find(`td:nth-child(3) > a:nth-child(2)`).attr("href");
    if (title.search("1080") == -1 || title.search("HEVC") == -1)
      isCutted = true;
    for (let j = 0; j < downloadList.length; j++) {
      let stringifySearchKeyword = `${searchTitle} - ${downloadList[
        j
      ].episodeNumber
        .toString()
        .padStart(2, "0")}`;
      if (title.search(stringifySearchKeyword) !== -1) {
        titleList.push({ title: title, magnet: magnet });
        isCutted = true;
      }
    }
    //if (!downloadedList) isCutted = false;
    if (isCutted == false) {
      titleList.push({ title: title, magnet: magnet });
    }
  });
  //console.log(titleList);
  writeFile(titleList, downloadedList);
};

const writeFile = async (titleList, downloadedList) => {
  let titleJson = [];
  let rotate = 0;
  titleList.forEach((eachTitle) => {
    const startIndex =
      eachTitle.title.search(searchTitle) + searchTitle.length + 3;
    const slice = eachTitle.title.slice(startIndex);
    const extractIndex = slice.indexOf("[");
    const episodeNumber = slice.slice(0, extractIndex - 1);

    titleJson[rotate] = {
      uploader: uploader,
      title: searchTitle,
      episodeNumber: parseInt(episodeNumber),
    };
    rotate += 1;
  });

  //console.log(titleJson);
  //console.log(downloadedList);

  if (downloadedList) {
    fs.writeFileSync(
      `src/public/${searchCommand}.json`,
      JSON.stringify([...titleJson, ...downloadedList])
    );
  } else {
    fs.writeFileSync(
      `src/public/${searchCommand}.json`,
      JSON.stringify(titleJson)
    );
  }
  console.log("done!");
};

tmdb();
