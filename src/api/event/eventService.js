const axios = require('axios');
const xml2js = require('xml2js');
const parser = new xml2js.Parser({ explicitArray: false });
const { client: redisClient } = require('../../config/redisClient');
const { parse } = require('dotenv');
const eventKey = process.env.API_KEY;

async function callItems(serviceTp, firstPages, totalPages) {
    try {
        let prefix;

        const url = 'https://apis.data.go.kr/B553457/cultureinfo/realm2';
        const numOfRows = '10';

        switch (serviceTp) {
            case '공연/전시':
                serviceTp = 'A';
                prefix = 'performance';
                break;
            case '행사/축제':
                serviceTp = 'B';
                prefix = 'festival';
                break;
            case '교육/체험':
                serviceTp = 'C';
                prefix = 'experience';
                break;
        }


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
                await saveItemsToRedis(itemArray, prefix);
            }
        }
        return { message: 'Done' };
    } catch (error) {
        console.error('Error fetching event data:', error);
    }
}

async function callItemsDetail(idxName, contentId) {
    try {
        const url = 'https://apis.data.go.kr/B553457/cultureinfo/detail2';
        const response = await axios.get(url, {
            params: {
                serviceKey: eventKey,
                seq: contentId,
            }
        });
        const data = response.data;
        const result = await parser.parseStringPromise(data);
        const item = result?.response?.body?.items?.item;

        await saveItemDetailToRedis(idxName, item, contentId);
    } catch (error) {
        console.error('Error fetching item detail:', error);
    }
}

async function saveItemDetailToRedis(idxName, item, key) {
    try {
        const hashKey = `${idxName}:detail:${key}`;

        if (item.area === "" || item.area == null) {
            item.area = "EMPTY";
        }

        if (item.area === "전북특별자치도") {
            item.area = "전북";
        }

        if (item.area === "전라남도") {
            item.area = "전남";
        }

        await redisClient.hSet(hashKey, {
            title: item.title,
            startDate: item.startDate,
            endDate: item.endDate,
            place: item.place,
            sigungu: item.sigungu,
            area: item.area,
            url: item.url,
            imgUrl: item.imgUrl,
            placeAddr: item.placeAddr,
            placeUrl: item.placeUrl,
            gpsX: item.gpsX,
            gpsY: item.gpsY,
            price: item.price,
            realmName: item.realmName,
            phone: item.phone,
        });
    } catch (error) {
        console.error('Error saving item detail to Redis:', error);
    }
}

async function saveItemsToRedis(items, prefix) {
    try {
        for (let i = 0; i < items.length; i++) {
            if (items[i].area === "" || items[i].area == null) {
                items[i].area = "EMPTY";
            }

            switch (items[i].area) {
                case "전북특별자치도":
                    items[i].area = "전북";
                    break;
                case "전라남도":
                    items[i].area = "전남";
                    break;
                case "서울특별시":
                    items[i].area = "서울";
                    break;
                case "제주특별자치도":
                    items[i].area = "제주";
                    break;
                case "충청남도":
                    items[i].area = "충남";
                    break;
                case "충청북도":
                    items[i].area = "충북";
                    break;

            }

            const hashKey = `${prefix}:${items[i].seq}`;
            await redisClient.hSet(hashKey, {
                genre: items[i].realmName,
                title: items[i].title,
                startDate: items[i].startDate,
                endDate: items[i].endDate,
                place: items[i].place,
                sigungu: items[i].sigungu,
                area: items[i].area,
                thumbnail: items[i].thumbnail,
            });

        }
    } catch (error) {
        console.error('Error saving items to Redis:', error);
    }
}

async function getItemsDetail(idxName, contentId) {
    try {
        const hashKey = `${idxName}:detail:${contentId}`;
        const item = await redisClient.hGetAll(hashKey);
        return item;
    } catch (error) {
        console.error('Error getting item detail from Redis:', error);
    }
};

async function getItemsByArea(idxName, area, maxCap = 100) {
    try {
        const tagQuery = `@area:{${area}}`;
        const indexName = `idx:${idxName}`;

        const countCmd = ['FT.SEARCH', indexName, tagQuery, 'DIALECT', '2', 'LIMIT', '0', '0'];
        const countRaw = await redisClient.sendCommand(countCmd);
        const total = Number(countRaw[0]) || 0;
        if (total === 0) return { total: 0, results: [] };

        const returnFields = ['area', 'startDate', 'endDate', 'title', 'place', 'thumbnail', 'sigungu', 'genre'];
        const fetchCount = Math.min(total, maxCap);
        const returnArgs = returnFields.length ? ['RETURN', String(returnFields.length), ...returnFields] : [];

        const cmd = [
            'FT.SEARCH',
            indexName,
            tagQuery,
            'DIALECT',
            '2',
            ...returnArgs,
            'LIMIT', '0', String(fetchCount)
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
            await callItemsDetail(idxName, contentId);
        }

        return { message: 'Detail info stored' };
    } catch (error) {
        console.error('Error storing detail info:', error);
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

//Redis에서 아이템 전부 꺼내기
async function getAllItemsfromRedis() {
    try {
        const pattern = "item:*";
        let cursor = '0';
        let keys = [];

        do {
            const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
            cursor = reply.cursor;
            keys = keys.concat(reply.keys);
        } while (cursor !== '0');

        const results = {};
        for (const key of keys) {
            const item = await redisClient.hGetAll(key);
            results[key] = item;
        }
        return results;
    } catch (error) {
        console.error('Error getting all items from Redis:', error);
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

module.exports = {
    callItems,
    getItemsByArea,
    storeDetailInfo,
    getItemsDetail,
    callItemsDetail,
    getAllItemsfromRedis,
    filterItemsWithDate
};