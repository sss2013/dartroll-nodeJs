const axios = require('axios');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
const { redisClient } = require('../../config/redisClient');
const { parse } = require('dotenv');
const eventKey = process.env.API_KEY;

const detailMapper = (it) => ({
    title: it.title,
    div: 'detail',
    startDate: it.startDate,
    endDate: it.endDate,
    place: it.place,
    sigungu: it.sigungu,
    area: it.area,
    url: it.url,
    imgUrl: it.imgUrl,
    placeAddr: it.placeAddr,
    placeUrl: it.placeUrl,
    gpsX: it.gpsX,
    gpsY: it.gpsY,
    price: it.price,
    genre: it.realmName,
    phone: it.phone,
    likes:0, 
})

const listMapper = (it) => ({
    genre: it.realmName,
    title: it.title,
    div: 'simple',
    startDate: it.startDate,
    endDate: it.endDate,
    place: it.place,
    sigungu: it.sigungu,
    area: it.area,
    thumbnail: it.thumbnail,
    likes:0, 
})


function filterItemArea(area) {
    if (area === "" || area == null) {
        return "EMPTY";
    }
    switch (area) {
        case "전라남도":
            return "전남";
        case "전라북도":
            return "전북";
        case "경기도":
            return "경기";
        case "전북특별자치도":
            return "전북";
        case "서울특별시":
            return "서울";
        case "강원특별자치도":
            return "강원";
        case "제주특별자치도":
            return "제주";
        case "충청남도":
            return "충남";
        case "충청북도":
            return "충북";
        case "경상남도":
            return "경남";
        case "경상북도":
            return "경북";
        case "대전광역시":
            return "대전";
        case "광주광역시":
            return "광주";
        case "부산광역시":
            return "부산";
        case "인천광역시":
            return "인천";
        case "대구광역시":
            return "대구";
        case "울산광역시":
            return "울산";
        case "세종특별자치시":
            return "세종";
        default:
            return area;
    }
}

function filterGenre(genre) {
    switch (genre) {
        case "음악/콘서트":
            genre = "음악\\/콘서트";
            break;
        case "뮤지컬/오페라":
            genre = "뮤지컬\\/오페라";
            break;
        case "무용/발레":
            genre = "무용\\/발레";
            break;
        default:
            break;
    }
    return genre;
}

function createTagQuery(idxName, area, genre, div) {
    let tagQuery;
    switch (idxName) {
        case 'performance':
            tagQuery = `@area:{${area}} @genre:{${genre}} @div:{${div}}`;
            break;
        case 'festival':
        case 'experience':
            tagQuery = `@area:{${area}} @div:{${div}}`;
            break;
    }
    return tagQuery;
}

async function getItems(idxName, firstPages, totalPages) {
    try {
        let serviceTp = '';

        switch (idxName) {
            case 'performance':
                serviceTp = 'A';
                break;
            case 'festival':
                serviceTp = 'B';
                break;
            case 'experience':
                serviceTp = 'C';
                break;
        }

        const url = process.env.EVENT_URL1.concat('/realm2');
        const numOfRows = '10';

        for (let pageNo = firstPages; pageNo <= totalPages; pageNo++) {
            const response = await axios.get(url, {
                params: {
                    serviceKey: eventKey,
                    numOfRows: numOfRows,
                    PageNo: pageNo,
                    serviceTp: serviceTp,
                }
            });

            const data = response.data;
            const result = await parser.parseStringPromise(data);
            const items = result?.response?.body?.items?.item;
            if (items) {
                const itemArray = Array.isArray(items) ? items : [items];
                await saveItems(idxName, itemArray, listMapper);
            }
        }
        return { message: 'Done' };
    } catch (error) {
        return { error: 'Error fetching event data' };
    }
}

async function getItemDetail(idxName, contentId) {
    try {
        const url = process.env.EVENT_URL1.concat('/detail2');
        const response = await axios.get(url, {
            params: {
                serviceKey: eventKey,
                seq: contentId,
            }
        });

        const data = response.data;
        const result = await parser.parseStringPromise(data);
        const item = result?.response?.body?.items?.item;

        idxName = idxName.concat(':detail');

        await saveItem(idxName, item, detailMapper);

        return { message: 'Done' };
    } catch (error) {
        return { error: 'Error fetching event detail data' };
    }
}


async function saveItem(idxName, item, mapper) {
    try {
        const key = item.seq;
        const hashKey = `${idxName}:${key}`;
        const payload = mapper ? mapper(item) : { ...item };
        item.area = filterItemArea(item.area);

        await redisClient.hSet(hashKey, payload);
    } catch (error) {
        return { error: 'Error saving item detail to Redis' };
    }
}

async function saveItems(idxName, items, mapper, usePipeline = true) {
    try {
        if (usePipeline && typeof redisClient.multi === 'function') {
            const multi = redisClient.multi();
            for (const item of items) {
                const key = item.seq;
                const hashKey = `${idxName}:${key}`;

                item.area = filterItemArea(item.area);
                const payload = mapper ? mapper(item) : { ...item };

                multi.hSet(hashKey, payload);
            }
            await multi.exec();
        } else {
            for (const item of items) {
                await saveItem(idxName, item, mapper);
            }
        }
    } catch (err) {
        return { error: 'Error saving items to Redis' };
    }
}


async function fetchItemsDetail(idxName, contentId) {
    try {
        const hashKey = `${idxName}:detail:${contentId}`;
        const item = await redisClient.hGetAll(hashKey);
        return item;
    } catch (error) {
        return { error: 'Error getting item detail from Redis' };
    }
};

async function fetchItems(idxName, tagQuery, returnFields, maxCap = 10) {
    try {
        const indexName = `idx:${idxName}`;

        const returnArgs = returnFields.length ? ['RETURN', String(returnFields.length), ...returnFields] : [];

        const cmd = [
            'FT.SEARCH',
            indexName,
            tagQuery,
            'DIALECT',
            '2',
            ...returnArgs,
            'LIMIT', '0', String(maxCap)
        ];

        const raw = await redisClient.sendCommand(cmd);

        const parsedResult = parseSearchResults(raw);
        return parsedResult;
    } catch (error) {
        console.error('Error getting items by area from Redis:', error);
    }
}


async function storeDetailInfo(idxName) {
    try {
        const pattern = `${idxName}:*`;
        let cursor = '0';
        let keys = [];

        do {
            const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = reply.cursor;
            keys = keys.concat(reply.keys);
        } while (cursor !== '0');

        for (const key of keys) {
            const contentId = key.split(':')[1];
            await getItemDetail(idxName, contentId);
        }

        return { message: 'Detail info stored' };
    } catch (error) {
        return { error: 'Error storing detail info' };
    }
}

//Redis 조회 결과 파싱
function parseSearchResults(raw) {
    const total = Number(raw[0]) || 0;
    const results = [];

    for (let i = 1; i < raw.length; i += 2) {
        const id = raw[i];
        const fieldArr = raw[i + 1] || [];
        const obj = { id };

        for (let j = 0; j < fieldArr.length; j += 2) {
            const key = fieldArr[j];
            const value = fieldArr[j + 1];
            obj[key] = value;
        }
        results.push(obj);
    }
    return { total, results };
}

async function storeSimpleItems(idxName) {
    try {
        const pattern = `${idxName}:[0-9]*`;
        let cursor = '0';
        let keys = [];

        do {
            const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = reply.cursor;
            keys = keys.concat(reply.keys);
        } while (cursor !== '0');

        for (const key of keys) {
            console.log(key);
        }
    } catch (error) {
        console.log(error);
    }
}


//Date 비어있는 값 조회
async function filterItemsWithDate(limit = 100) {
    try {
        console.log('Filtering items with missing dates...');
        const pattern = "festival:*";
        let cursor = '0';
        let keys = [];
        const results = [];

        do {
            const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = reply.cursor;
            keys = keys.concat(reply.keys);
        } while (cursor !== '0');

        for (const key of keys) {
            const item = await redisClient.hGetAll(key);
            if (!item.startDate || !item.endDate) {
                results.push(key);
            }

            if (results.length >= limit) {
                break;
            }
        }
        return results;
    } catch (error) {
        console.error('Error filtering all items from Redis:', error);
    }
}

async function likeEvent(idxName,eventId){ 
    const hashKey = `${idxName}:${eventId}`;
    const newLikes=await redisClient.hIncrBy(hashKey,'likes',1);
    return newLikes;
}

module.exports = {
    getItems,
    filterGenre,
    createTagQuery,
    fetchItems,
    getItemDetail,
    storeDetailInfo,
    fetchItemsDetail,
    filterItemsWithDate,
    storeSimpleItems
};