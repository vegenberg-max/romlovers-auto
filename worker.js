const FEEDS = [

  "https://facebook-rss.onrender.com/feed/1",
  "https://facebook-rss.onrender.com/feed/2",
  "https://facebook-rss.onrender.com/feed/3",
  "https://facebook-rss.onrender.com/feed/4",
  "https://facebook-rss.onrender.com/feed/5",
  "https://facebook-rss.onrender.com/feed/6",
  "https://facebook-rss.onrender.com/feed/7",
  "https://facebook-rss.onrender.com/feed/8",
  "https://facebook-rss.onrender.com/feed/9",
  "https://facebook-rss.onrender.com/feed/10",
  "https://facebook-rss.onrender.com/feed/11",
  "https://facebook-rss.onrender.com/feed/12",
  "https://facebook-rss.onrender.com/feed/13",
  "https://facebook-rss.onrender.com/feed/14",
  "https://facebook-rss.onrender.com/feed/15",
  "https://facebook-rss.onrender.com/feed/16",
  "https://facebook-rss.onrender.com/feed/17",
  "https://fetchrss.com/feed/1wrkGa34t3S01wrkFlEUq2WQ.rss", // Romania
  "https://fetchrss.com/feed/1wrkGa34t3S01wrl1A0l62Og.rss", // Cozyness
  "https://fetchrss.com/feed/1wrkGa34t3S01wrl5FErR4Rf.rss", // Odaia Cu Povesti
  "https://fetchrss.com/feed/1wrkGa34t3S01wwngW1QYGX5.rss", // Sweet Bucharest
  "https://fetchrss.com/feed/1wrkGa34t3S01wwniV5gC5a6.rss" // Vipdeva
];

const VIDEO_API =
  "https://facebook-video-api-q2o3.onrender.com";

const TELEGRAM_CHAT_ID =
  "@romania_lovers";

const ADMIN_CHAT_ID =
  1598181428;

const KV_PREFIX =
  "published:";


/* =========================================================
   BASIC HELPERS
========================================================= */

function clean(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(block, name) {
  const regex =
    new RegExp(
      `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
      "i"
    );

  const match =
    block.match(regex);

  return match
    ? clean(match[1])
    : "";
}

function getAllItems(xml) {
  return [
    ...xml.matchAll(
      /<item\b[^>]*>([\s\S]*?)<\/item>/gi
    )
  ].map(
    match =>
      match[1]
  );
}

function getFacebookUrl(text) {

  const value =
    String(text || "")
      .replace(
        /&amp;/g,
        "&"
      );


  const patterns = [

    /*
       Reels
    */

    /https?:\/\/www\.facebook\.com\/reel\/[A-Za-z0-9]+[^\s"'<>]*/i,


    /*
       Videos
    */

    /https?:\/\/www\.facebook\.com\/[^\/\s"'<>]+\/videos\/[A-Za-z0-9]+[^\s"'<>]*/i,


    /*
       Facebook Groups:
       /groups/123/posts/456
       /groups/constanta360/posts/456
    */

    /https?:\/\/www\.facebook\.com\/groups\/[^\/\s"'<>]+\/posts\/[^\/\s"'<>]+[^\s"'<>]*/i,


    /*
       Звичайні сторінки:
       /SARMOIU/posts/pfbid...
       /meteofor.ro/posts/pfbid...
       /123456/posts/789...
    */

    /https?:\/\/www\.facebook\.com\/[^\/\s"'<>]+\/posts\/[^\/\s"'<>]+[^\s"'<>]*/i

  ];


  for (
    const pattern
    of patterns
  ) {

    const match =
      value.match(
        pattern
      );


    if (match) {

      return match[0]
        .replace(
          /&amp;/g,
          "&"
        )
        .replace(
          /[.,;)\]]+$/,
          ""
        );
    }
  }


  return null;
}

function getImageUrls(text) {

  const value =
    String(text || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');


  /*
     Беремо насамперед реальні <img src="">
     з RSS.
  */

  const imgUrls =
    [
      ...value.matchAll(
        /<img[^>]+src=["']([^"']+)["']/gi
      )
    ]
      .map(
        match =>
          match[1]
            .replace(/&amp;/g, "&")
      );


  /*
     Якщо <img> у RSS немає —
     тоді лише як запасний варіант
     шукаємо прямі картинки.
  */

  const candidates =
    imgUrls.length > 0
      ? imgUrls
      : (
          value.match(
            /https?:\/\/[^"'<> ]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<> ]*)?/gi
          ) || []
        );


  const result = [];
  const seen = new Set();


  for (
    const rawUrl
    of candidates
  ) {

    let parsed;

    try {

      parsed =
        new URL(
          rawUrl
        );

    } catch {

      continue;
    }


    const hostname =
      parsed.hostname
        .toLowerCase();

    const pathname =
      parsed.pathname
        .toLowerCase();


    /*
       Викидаємо системні картинки Facebook:
       emoji, іконки, аватарні заглушки,
       елементи інтерфейсу.
    */

    if (
      hostname === "static.xx.fbcdn.net" ||
      pathname.includes("/images/emoji.php") ||
      pathname.includes("/rsrc.php") ||
      pathname.includes("/rsrc/")
    ) {

      continue;
    }


    /*
       Робимо ключ для видалення дублів.

       external...fbcdn.net часто містить
       справжню картинку всередині ?url=
    */

    let duplicateKey =
      rawUrl;


    const originalUrl =
      parsed.searchParams.get(
        "url"
      );


    if (
      originalUrl &&
      /^https?:\/\//i.test(
        originalUrl
      )
    ) {

      duplicateKey =
        originalUrl;

    } else if (
      hostname.endsWith(
        ".fbcdn.net"
      )
    ) {

      /*
         У Facebook токени в query змінюються,
         але шлях до того самого фото
         зазвичай той самий.
      */

      duplicateKey =
        hostname +
        pathname;
    }


    try {

      const keyUrl =
        new URL(
          duplicateKey
        );

      keyUrl.hash =
        "";

      /*
         Для оригінальних картинок
         забираємо зайві tracking-параметри.
      */

      duplicateKey =
        keyUrl.origin +
        keyUrl.pathname;

    } catch {
    }


    if (
      seen.has(
        duplicateKey
      )
    ) {

      continue;
    }


    seen.add(
      duplicateKey
    );

    result.push(
      rawUrl
    );
  }


  return result;
}


/* =========================================================
   HASH
========================================================= */

async function hash(value) {

  const bytes =
    new TextEncoder()
      .encode(
        String(value)
      );

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes
    );

  return [
    ...new Uint8Array(
      digest
    )
  ]
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(
            2,
            "0"
          )
    )
    .join("");
}


/* =========================================================
   DUPLICATES
========================================================= */

async function isPublished(
  env,
  key
) {

  if (!key) {
    return false;
  }

  const id =
    await hash(key);

  return !!(
    await env.CHARIVNA_ROMANIA.get(
      KV_PREFIX + id
    )
  );
}

async function markPublished(
  env,
  key
) {

  if (!key) {
    return;
  }

  const id =
    await hash(key);

  await env.CHARIVNA_ROMANIA.put(
    KV_PREFIX + id,
    "1"
  );
}

function facebookRetryKey(
  facebookUrl
) {

  return (
    "facebook-retry:" +
    facebookUrl
  );
}


async function isFacebookRetryBlocked(
  env,
  facebookUrl
) {

  const value =
    await env.CHARIVNA_ROMANIA.get(
      facebookRetryKey(
        facebookUrl
      )
    );

  return Boolean(
    value
  );
}


async function blockFacebookRetry(
  env,
  facebookUrl,
  seconds = 3600
) {

  await env.CHARIVNA_ROMANIA.put(

    facebookRetryKey(
      facebookUrl
    ),

    "1",

    {
      expirationTtl:
        seconds
    }

  );
}

async function unmarkPublished(
  env,
  key
) {

  if (!key) {
    return;
  }

  const id =
    await hash(
      key
    );

  await env.CHARIVNA_ROMANIA.delete(
    KV_PREFIX + id
  );
}


/* =========================================================
   LOCATIONS
========================================================= */

const LOCATIONS = [

  "Piatra Craiului",

  "Bucharest",
  "București",
  "Bucuresti",

  "Brașov",
  "Brasov",

  "Sibiu",

  "Cluj-Napoca",
  "Cluj",

  "Constanța",
  "Constanta",

  "Iași",
  "Iasi",

  "Sinaia",

  "Bușteni",
  "Busteni",

  "Bran",

  "Sighișoara",
  "Sighisoara",

  "Oradea",

  "Timișoara",
  "Timisoara",

  "Maramureș",
  "Maramures",

  "Transilvania",

  "Carpați",
  "Carpati",

  "Dunărea",
  "Dunarea",

  "Marea Neagră",
  "Marea Neagra",

  "Delta Dunării",
  "Delta Dunarii",

  "Peleș",
  "Peles",

  "Poiana Brașov",
  "Poiana Brasov",

  "Retezat",

  "Apuseni",

  "Făgăraș",
  "Fagaras",

  "Bucegi",

  "Moldova",

  "Dobrogea"

];

const MOUNTAIN_RANGES = {

  "bucegi":
    "Munții Bucegi",

  "bucegi mountains":
    "Munții Bucegi",

  "retezat":
    "Munții Retezat",

  "retezat mountains":
    "Munții Retezat",

  "piatra craiului":
    "Munții Piatra Craiului",

  "craiului":
    "Munții Piatra Craiului",

  "făgăraș":
    "Munții Făgăraș",

  "fagaras":
    "Munții Făgăraș",

  "apuseni":
    "Munții Apuseni",

  "apuseni mountains":
    "Munții Apuseni",

  "carpați":
    "Munții Carpați",

  "carpati":
    "Munții Carpați",

  "parâng":
    "Munții Parâng",

  "parang":
    "Munții Parâng",

  "rodnei":
    "Munții Rodnei",

  "rodna":
    "Munții Rodnei",

  "ceahlău":
    "Munții Ceahlău",

  "ceahlau":
    "Munții Ceahlău"
};


/* =========================================================
   ROMANIAN LOCATION NAMES
========================================================= */

const LOCATION_RO = {

  "Carpathian Mountains":
    "Munții Carpați",

  "Fagaras Mountains":
    "Munții Făgăraș",

  "Făgăraș Mountains":
    "Munții Făgăraș",

  "Bucegi Mountains":
    "Munții Bucegi",

  "Retezat Mountains":
    "Munții Retezat",

  "Apuseni Mountains":
    "Munții Apuseni",

  "Piatra Craiului Mountains":
    "Munții Piatra Craiului",

  "Rodna Mountains":
    "Munții Rodnei",

  "Ceahlau Mountains":
    "Munții Ceahlău",

  "Ceahlău Mountains":
    "Munții Ceahlău",

  "Balea Lake":
    "Lacul Bâlea",

  "Bâlea Lake":
    "Lacul Bâlea",

  "Red Lake":
    "Lacul Roșu",

  "Olt Valley":
    "Valea Oltului",

  "Prahova Valley":
    "Valea Prahovei",

  "Danube Delta":
    "Delta Dunării",

  "Danube River":
    "Dunărea",

  "Bucharest":
    "București",

  "Bucuresti":
    "București",

  "București":
    "București",

  "Brasov":
    "Brașov",

  "Brașov":
    "Brașov",

  "Constanta":
    "Constanța",

  "Constanța":
    "Constanța",

  "Cluj":
    "Cluj-Napoca",

  "Cluj-Napoca":
    "Cluj-Napoca",

  "Sibiu":
    "Sibiu",

  "Iasi":
    "Iași",

  "Iași":
    "Iași",

  "Timisoara":
    "Timișoara",

  "Timișoara":
    "Timișoara",

  "Arad":
    "Arad",

  "Oradea":
    "Oradea",

  "Satu Mare":
    "Satu Mare",

  "Baia Mare":
    "Baia Mare",

  "Bistrita":
    "Bistrița",

  "Bistrița":
    "Bistrița",

  "Alba Iulia":
    "Alba Iulia",

  "Deva":
    "Deva",

  "Hunedoara":
    "Hunedoara",

  "Targu Mures":
    "Târgu Mureș",

  "Târgu Mureș":
    "Târgu Mureș",

  "Târgu Jiu":
    "Târgu Jiu",

  "Targu Jiu":
    "Târgu Jiu",

  "Craiova":
    "Craiova",

  "Pitesti":
    "Pitești",

  "Pitești":
    "Pitești",

  "Ploiesti":
    "Ploiești",

  "Ploiești":
    "Ploiești",

  "Buzau":
    "Buzău",

  "Buzău":
    "Buzău",

  "Focsani":
    "Focșani",

  "Focșani":
    "Focșani",

  "Galati":
    "Galați",

  "Galați":
    "Galați",

  "Braila":
    "Brăila",

  "Brăila":
    "Brăila",

  "Tulcea":
    "Tulcea",

  "Suceava":
    "Suceava",

  "Botosani":
    "Botoșani",

  "Botoșani":
    "Botoșani",

  "Piatra Neamt":
    "Piatra Neamț",

  "Piatra Neamț":
    "Piatra Neamț",

  "Bacau":
    "Bacău",

  "Bacău":
    "Bacău",

  "Vaslui":
    "Vaslui",

  "Ramnicu Valcea":
    "Râmnicu Vâlcea",

  "Râmnicu Vâlcea":
    "Râmnicu Vâlcea",

  "Resita":
    "Reșița",

  "Reșița":
    "Reșița",

  "Drobeta-Turnu Severin":
    "Drobeta-Turnu Severin",

  "Slatina":
    "Slatina",

  "Giurgiu":
    "Giurgiu",

  "Alexandria":
    "Alexandria",

  "Calarasi":
    "Călărași",

  "Călărași":
    "Călărași",

  "Slobozia":
    "Slobozia",

  "Voluntari":
    "Voluntari",

  "Sinaia":
    "Sinaia",

  "Busteni":
    "Bușteni",

  "Bușteni":
    "Bușteni",

  "Predeal":
    "Predeal",

  "Azuga":
    "Azuga",

  "Bran":
    "Bran",

  "Sighisoara":
    "Sighișoara",

  "Sighișoara":
    "Sighișoara",

  "Fagaras":
    "Făgăraș",

  "Făgăraș":
    "Făgăraș",

  "Peles":
    "Peleș",

  "Peleș":
    "Peleș",

  "Poiana Brasov":
    "Poiana Brașov",

  "Poiana Brașov":
    "Poiana Brașov",

  "Mamaia":
    "Mamaia",

  "Eforie Nord":
    "Eforie Nord",

  "Eforie Sud":
    "Eforie Sud",

  "Costinesti":
    "Costinești",

  "Costinești":
    "Costinești",

  "Neptun":
    "Neptun",

  "Olimp":
    "Olimp",

  "Mangalia":
    "Mangalia",

  "Vama Veche":
    "Vama Veche",

  "Maramures":
    "Maramureș",

  "Maramureș":
    "Maramureș",

  "Transylvania":
    "Transilvania",

  "Transilvania":
    "Transilvania",

  "Carpathians":
    "Munții Carpați",

  "Carpati":
    "Munții Carpați",

  "Carpați":
    "Munții Carpați",

  "Bucegi":
    "Munții Bucegi",

  "Munții Bucegi":
    "Munții Bucegi",

  "Retezat":
    "Munții Retezat",

  "Munții Retezat":
    "Munții Retezat",

  "Apuseni":
    "Munții Apuseni",

  "Munții Apuseni":
    "Munții Apuseni",

  "Piatra Craiului":
    "Munții Piatra Craiului",

  "Munții Piatra Craiului":
    "Munții Piatra Craiului",

  "Danube":
    "Dunărea",

  "Dunarea":
    "Dunărea",

  "Dunărea":
    "Dunărea",

  "Black Sea":
    "Marea Neagră",

  "Marea Neagra":
    "Marea Neagră",

  "Marea Neagră":
    "Marea Neagră",

  "Delta Dunarii":
    "Delta Dunării",

  "Delta Dunării":
    "Delta Dunării",

  "Moldova":
    "Moldova",

  "Dobrogea":
    "Dobrogea"
};


function normalizeLocation(
  location
) {

  if (!location) {
    return "";
  }

  const key =
    location
      .trim()
      .toLowerCase();

  if (
    MOUNTAIN_RANGES[key]
  ) {

    return (
      MOUNTAIN_RANGES[key]
    );
  }

  const value =
    clean(location);

  return (
    LOCATION_RO[value] ||
    value
  );
}


/* =========================================================
   FIND LOCATION
========================================================= */

function cleanLocationCandidate(
  value
) {

  if (!value) {
    return "";
  }

  return String(value)

    /*
       Facebook / FetchRSS сміття
    */
    .replace(
      /\b(?:All reactions|Like|View more comments|Feed generated with FetchRSS).*$/i,
      ""
    )

    /*
       lu’ Voda -> lui Voda
    */
    .replace(
      /\blu[’']\s+/gi,
      "lui "
    )

    /*
       Зайві пробіли
    */
    .replace(
      /\s+/g,
      " "
    )

    /*
       Крапки/коми по краях
    */
    .replace(
      /^[\s,.;:–—-]+|[\s,.;:–—-]+$/g,
      ""
    )

    .trim();
}

const FEED_LOCATION_OVERRIDES = {

  2:
    "București",

  9:
    "București",

  14: "Castelul Cantacuzino"

};


  function normalizeLocationSmart(
  value
) {

  const cleanValue =
    cleanLocationCandidate(
      value
    );

  if (!cleanValue) {
    return "";
  }

  const romanianValue =
    cleanValue
      .replace(/ş/g, "ș")
      .replace(/Ş/g, "Ș")
      .replace(/ţ/g, "ț")
      .replace(/Ţ/g, "Ț");

  

  


  const aliases = {

    "rucar":
      "Rucăr",

    "rucăr":
      "Rucăr",

    "balea lac":
      "Lacul Bâlea",

    "carpathian":
      "Carpați",

    "констанца":
      "Constanța",

    "город констанца":
      "Constanța",

    "bâlea lac":
      "Lacul Bâlea",

    "balea lake":
      "Lacul Bâlea",

    "bâlea lake":
      "Lacul Bâlea",

    "romanian carpathians":
      "Munții Carpați",

    "carpathian mountains":
      "Munții Carpați",

    "carpathians":
      "Munții Carpați",

    "ciucas mountains":
      "Munții Ciucaș",

    "ciucaș mountains":
      "Munții Ciucaș",

    "fagaras mountains":
      "Munții Făgăraș",

    "făgăraș mountains":
      "Munții Făgăraș",

    "maramures":
      "Maramureș",

    "maramureș":
      "Maramureș",

    "bucharest":
      "București",

    "bucuresti":
      "București",

    "bucurești":
      "București",

    "brasov":
      "Brașov",

    "brașov":
      "Brașov",

    "iasi":
      "Iași",

    "iași":
      "Iași",

    "orsova":
      "Orșova",

    "orșova":
      "Orșova",

    "vadu":
      "Vadu"

  };


  const lower =
    romanianValue
      .toLowerCase();

  if (
    /^b(?:a|â)lea\s+lac\b/i.test(
      romanianValue
    )
  ) {
    return "Lacul Bâlea";
  }


  if (
    aliases[lower]
  ) {

    return aliases[lower];
  }


  return normalizeLocation(
    romanianValue
  );
}

function findLocation(rawItem, feed = null) {

  const cleanText = (value) =>
    String(value || "")
      .replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/gi, '"')
      .replace(/\s+/g, " ")
      .trim();


  const normalize = (value) => {

    let result =
      cleanLocationCandidate(
        cleanText(value)
      );

    if (!result) {
      return "";
    }


    /*
      Прибираємо Facebook UI,
      якщо воно причепилося до назви.
    */

    result = result
      .replace(
        /\s+(?:Подписаться|Підписатися|Urmărește|Urmareste|Follow|Administrator|Администратор|Адміністратор|Показать перевод|Показати переклад|Vezi traducerea|See translation)\b.*$/iu,
        ""
      )
      .replace(
        /\s+(?:и ещё|і ще|și încă|si inca)\s+\d+.*$/iu,
        ""
      )
      .replace(
        /\s+(?:Ответить|Відповісти|Reply|Răspunde|Raspunde)\b.*$/iu,
        ""
      )
      .replace(
        /\s+(?:Напишите комментарий|Напишіть коментар|Scrie un comentariu|Write a comment).*$/iu,
        ""
      )
      .replace(
        /\s+(?:Смотреть другие комментарии|Смотреть другие коммента|Vezi mai multe comentarii|View more comments).*$/iu,
        ""
      )
      .replace(
        /\s+(?:Показать перевод|Показати переклад)\b.*$/iu,
        ""
      )
      .replace(/[|•]+.*$/u, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s,.:;–—-]+|[\s,.:;–—-]+$/g, "")
      .trim();


    if (!result) {
      return "";
    }


    /*
      Невеликі очевидні нормалізації.
      Не робимо тут величезний словник міст.
    */

    const aliases = {
      "costinesti": "Costinești",
      "zarnesti": "Zărnești",
      "brasov": "Brașov",
      "bucuresti": "București",
      "bucurești": "București",
      "delta dunarii": "Delta Dunării",
      "delta dunării": "Delta Dunării",
      "piatra craiului": "Piatra Craiului"
    };


    const lower =
      result.toLowerCase();


    if (aliases[lower]) {
      return aliases[lower];
    }


    return normalizeLocationSmart(result);
  };


  /*
    ========================================================
    1. ЖОРСТКІ OVERRIDE
    ========================================================
  */

  if (
    feed !== null &&
    feed !== undefined &&
    typeof FEED_LOCATION_OVERRIDES !== "undefined" &&
    FEED_LOCATION_OVERRIDES[feed]
  ) {
    return FEED_LOCATION_OVERRIDES[feed];
  }


  /*
    ========================================================
    2. ВИТЯГУЄМО РЕАЛЬНИЙ ТЕКСТ З XML ITEM

    rawItem у нас НЕ object.
    Тому rawItem?.title тут не працює.
    ========================================================
  */

  const title =
    getTag(rawItem, "title");

  const description =
    getTag(rawItem, "description");

  const contentEncoded =
    getTag(rawItem, "content:encoded");

  const mediaDescription =
    getTag(rawItem, "media:description");

  const summary =
    getTag(rawItem, "summary");

  const content =
    getTag(rawItem, "content");


  const text =
    cleanText(
      [
        title,
        description,
        contentEncoded,
        mediaDescription,
        summary,
        content
      ]
        .filter(Boolean)
        .join(" ")
    );


  if (!text) {
    return "";
  }


  /*
    ========================================================
    3. ЯВНА ЛОКАЦІЯ В RSS-ТЕГАХ
    ========================================================
  */

  const explicitFields = [
    getTag(rawItem, "location"),
    getTag(rawItem, "georss:featurename"),
    getTag(rawItem, "media:location"),
    getTag(rawItem, "geo:location"),
    getTag(rawItem, "place")
  ];


  for (const field of explicitFields) {

    const candidate =
      normalize(field);

    if (
      candidate &&
      candidate.length >= 2
    ) {
      return candidate;
    }
  }


  /*
    ========================================================
    4. LOC: / LOCAȚIE: / LOCATION:

    Приклад:

    Loc: Măgura, Șirnea și Luminiș - Apuseni, Romania Foto:

    Тут НЕ обрізаємо на першій комі.
    ========================================================
  */

  const labelledLocationPatterns = [

    /\b(?:Locație|Locatie|Location|Loc)\s*:\s*(.{2,180}?)(?=\s+(?:Foto|Photo|Credit|Autor|Author)\s*:|(?:Feed generated)|$)/iu,

    /\b(?:Locație|Locatie|Location|Loc)\s*:\s*([^|]{2,160}?)(?=\s+(?:Показать перевод|Показати переклад|Vezi traducerea|See translation|Подписаться|Підписатися)|$)/iu

  ];


  for (
    const pattern
    of labelledLocationPatterns
  ) {

    const match =
      text.match(pattern);

    if (match?.[1]) {

      let candidate =
        normalize(match[1]);


      candidate = candidate
        .replace(
          /\s*,?\s*Romania\s*$/iu,
          ""
        )
        .trim();


      if (candidate) {
        return candidate;
      }
    }
  }


  /*
    ========================================================
    5. FACEBOOK CHECK-IN

    Gabriel GF сейчас здесь: Obcina Mestecăniș
    X is at Y
    X is in Y
    X este aici: Y
    ========================================================
  */

  const checkInPatterns = [

  /(?:сейчас\s+здесь|зараз\s+тут|зараз\s+у|este\s+aici)\s*:\s*([^.;|\n]{2,180})/iu,

  /\bis\s+(?:at|in)\s+([^.;|\n]{2,180})/iu

  ];


  for (
    const pattern
    of checkInPatterns
  ) {

    const match =
      text.match(pattern);

    if (!match?.[1]) {
      continue;
    }


    const rawCheckIn =
      match[1]
        .replace(
          /\s+(?:Показать перевод|Показати переклад|See translation|Vezi traducerea).*$/iu,
          ""
        )
        .trim();


    /*
      Facebook може дати:

      Румыния, Сучава, Baia
      Румыния, Сучава, Radauti

      Йдемо справа наліво:
      останній компонент — найконкретніший.
    */

    const parts =
      rawCheckIn
        .split(",")
        .map(
          part =>
            part.trim()
        )
        .filter(Boolean);


    const ignored =
      new Set([
        "romania",
        "румыния",
        "румунія",
        "românia"
      ]);


    for (
      let i = parts.length - 1;
      i >= 0;
      i--
    ) {

      let part =
        parts[i]
          .replace(
            /^(?:Город|Місто|City|Orașul|Orasul)\s+/iu,
            ""
          )
          .trim();

      const lowerPart =
        part.toLowerCase();


      if (
        ignored.has(
          lowerPart
        )
      ) {
        continue;
      }


      /*
        Нормалізація назв без діакритики.
      */

      const localAliases = {

        "radauti":
          "Rădăuți",

        "rădăuți":
          "Rădăuți",

        "suceava":
          "Suceava",

        "baia":
          "Baia"

      };


      if (
        localAliases[
          lowerPart
        ]
      ) {
        return localAliases[
          lowerPart
        ];
      }


      const candidate =
        normalize(part);


      if (candidate) {
        return candidate;
      }
    }
  }


  for (
    const pattern
    of checkInPatterns
  ) {

    const match =
      text.match(pattern);

    if (match?.[1]) {

      const candidate =
        normalize(match[1]);

      if (
        candidate &&
        candidate.length >= 2
      ) {
        return candidate;
      }
    }
  }


  /*
    ========================================================
    6. КОНКРЕТНЕ МІСЦЕ ПЕРЕД JUDEȚ

    Zărnești, Jud Brașov
    Sasca Montană, jud. Caraș-Severin

    Повертаємо Zărnești / Sasca Montană,
    а НЕ Brașov / Caraș-Severin.
    ========================================================
  */

  const beforeCounty =
    text.match(
      /(?:^|[\s.!?])([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,3})\s*,\s*(?:Jud\.?|Județul|Judetul|Județ|Judet)\s+[A-ZĂÂÎȘȚŞŢ]/u
    );


  if (beforeCounty?.[1]) {

    const candidate =
      normalize(beforeCounty[1]);

    if (candidate) {
      return candidate;
    }
  }


  /*
    ========================================================
    7. КОНКРЕТНІ ГЕОГРАФІЧНІ ОБ'ЄКТИ

    Не список конкретних назв.
    Список ТИПІВ місць.

    Castelul Cantacuzino
    Cascada „La Văioaga”
    Cabana Cărbunar
    Chilia lui Daniil Sihastru
    Delta Dunării
    Munții Piatra Craiului
    ========================================================
  */

  /*
     Якщо в пості прямо вказаний гірський пік,
     він точніший за Cabana / Masiv / загальну локацію.

     Cabana Dochia, Vârful Toaca
     -> Vârful Toaca
  */

  const peakMatch =
    text.match(
      /\b(Vârful|Varful)\s+([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,2})\b/u
    );

  if (peakMatch?.[2]) {

    const peakName =
      normalize(peakMatch[2]);

    if (peakName) {
      return `Vârful ${peakName}`;
    }
  }


  const objectTypes =
    "(?:Mănăstirea|Manastirea|" +
    "Castelul|" +
    "Cetatea|" +
    "Cascada|" +
    "Lacul|" +
    "Barajul|" +
    "Cheile|" +
    "Peștera|Pestera|" +
    "Valea|" +
    "Obcina|" +
    "Munții|Muntii|" +
    "Masivul|" +
    "Vârful|Varful|" +
    "Defileul|" +
    "Rezervația|Rezervatia|" +
    "Parcul|" +
    "Cabana|" +
    "Chilia|" +
    "Delta)";


  /*
    Cascada „La Văioaga”
  */

  const quotedObject =
    text.match(
      new RegExp(
        "\\b(" +
        objectTypes +
        ")\\s+[„“\"']([^”“\"'\\n]{2,80})[”“\"']",
        "iu"
      )
    );


  if (quotedObject) {

    const type =
      normalize(quotedObject[1]);

    const name =
      normalize(quotedObject[2]);


    if (
      type &&
      name
    ) {
      return `${type} ${name}`;
    }
  }


  /*
    Об'єкт без лапок.

    Навмисно максимум кілька слів,
    щоб не отримати:

    Castelul Cantacuzino Dragii noștri...
  */

  const objectPattern =
    new RegExp(
      "\\b(" +
        objectTypes +
      ")" +
      "\\s+" +
      "(" +
        "(?:" +
          "(?:de|din|lui|al|a|ale)\\s+" +
        "){0,2}" +

        "[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\\-]+" +

        "(?:" +
          "\\s+(?:" +
            "de|din|lui|al|a|ale|" +
            "[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\\-]+" +
          ")" +
        "){0,2}" +
      ")" +

      "(?=" +
        "\\s*[,.;:!?()\\n]" +
        "|" +
        "\\s+(?:din|în|in|este|se|cu|și|si|iar|unde|care|Dragii|Ultimele|Astăzi|Astazi|Foto|Photo)\\b" +
        "|" +
        "$" +
      ")",

      "iu"
    );


  const objectMatch =
    text.match(objectPattern);


  if (objectMatch) {

    const type =
      normalize(objectMatch[1]);

    const name =
      normalize(objectMatch[2]);


    if (
      type &&
      name
    ) {
      return `${type} ${name}`;
    }
  }


  /*
    ========================================================
    8. АНГЛІЙСЬКІ НАЗВИ ПРИРОДНИХ ОБ'ЄКТІВ

    Zănoagei Gorges  -> Cheile Zănoagei
    Bucegi Mountains -> Munții Bucegi
    ========================================================
  */

    const englishObject =
      text.match(
        /\b([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50}(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50}){0,2})\s+(Gorges|Mountains|Mountain|Lake|Waterfall)\b/u
      );


    if (englishObject) {

      const name =
        normalize(englishObject[1]);

      const type =
        englishObject[2].toLowerCase();


      if (name) {

        if (type === "gorges") {
          return `Cheile ${name}`;
        }

        if (
          type === "mountains" ||
          type === "mountain"
        ) {

          if (
            /^Munții\s+/iu.test(
              name
            )
          ) {
            return name;
          }

          return `Munții ${name}`;
        }

        if (type === "lake") {
          return `Lacul ${name}`;
        }

        if (type === "waterfall") {
          return `Cascada ${name}`;
        }
      }
    }



  /*
    ========================================================
    МІСТО ПРЯМО В ТЕКСТІ

    Pe strada Gr.Tocilescu, Constanța
    -> Constanța

    in jurul Mangaliei
    -> Mangalia
    ========================================================
  */

  /** @type {Array<[RegExp, string]>} */
  const directPlaceAliases = [
    [/\bConstanța\b/iu, "Constanța"],
    [/\bConstanta\b/iu, "Constanța"],

    [/\bMangaliei\b/iu, "Mangalia"],
    [/\bMangalia\b/iu, "Mangalia"],

    [/\bBrașov\b/iu, "Brașov"],
    [/\bBrasov\b/iu, "Brașov"],

    [/\bBucurești\b/iu, "București"],
    [/\bBucuresti\b/iu, "București"],

    [/\bSibiu\b/iu, "Sibiu"],

    [/\bCraiova\b/iu, "Craiova"],

    [/\bCluj-Napoca\b/iu, "Cluj-Napoca"],

    [/\bTimișoara\b/iu, "Timișoara"],
    [/\bTimisoara\b/iu, "Timișoara"],

    [/\bIași\b/iu, "Iași"],
    [/\bIasi\b/iu, "Iași"],

    [/\bOradea\b/iu, "Oradea"]
  ];


  for (
    const [pattern, location]
    of directPlaceAliases
  ) {

    if (
      pattern.test(text)
    ) {
      return location;
    }
  }


  
  /*
    ========================================================
    9. "PRIN RĂCĂDĂU"

    Це досить сильна конструкція:
    "Prin Răcădău"
    "Prin Sinaia"

    Але якщо це район відомого міста,
    для каналу повертаємо місто.
    ========================================================
  */

  const prinPlace =
    text.match(
      /\bPrin\s+([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,2})\b/u
    );


  if (prinPlace?.[1]) {

    const candidate =
      normalize(prinPlace[1]);


    /*
      Răcădău — район Brașov.
      Для каналу пишемо місто.
    */

    if (
      candidate === "Răcădău" &&
      /\bBrașov\b/iu.test(text)
    ) {
      return "Brașov";
    }


    if (candidate) {
      return candidate;
    }
  }


  
  /*
    ========================================================
    10. "LA BOIȚA"

    НЕ робимо старий небезпечний:
    la + усе підряд.

    Тут беремо лише 1-2 слова,
    що починаються з великої літери.

    "în șantier la Boița"
    ========================================================
  */

  const laPlace =
    text.match(
      /\bla\s+([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+)?)(?=\s*[,.;:!?–—-]|\s+(?:în|in|din|pe|și|si|unde|ora|la)\b|$)/u
    );


  if (laPlace?.[1]) {

    const candidate =
      normalize(laPlace[1]);

    if (candidate) {
      return candidate;
    }
  }


  /*
    ========================================================
    11. НАЗВА МІЖ ТИРЕ

    ultima zi de vara - Costinesti - 31.08.26

    Працює лише з короткою назвою
    з великої літери.
    ========================================================
  */

  const betweenDashes =
    text.match(
      /[-–—]\s*([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,2})\s*[-–—]\s*(?:\d{1,2}[./-]\d{1,2}|\d{1,2}:)/u
    );


  if (betweenDashes?.[1]) {

    const candidate =
      normalize(betweenDashes[1]);

    if (candidate) {
      return candidate;
    }
  }


  /*
    ========================================================
    12. МІСЦЕ ПЕРЕД ЧАСОМ

    Paleu 22:00

    Використовуємо тільки як слабший сигнал.
    ========================================================
  */
  const placeBeforeDate =
    text.match(
      /\b([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50}(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50})?)\s+\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\s+\d{1,2}:\d{2}\b/u
    );


  if (
    placeBeforeDate?.[1]
  ) {

    const candidate =
      normalize(
        placeBeforeDate[1]
      );

    if (candidate) {
      return candidate;
    }
  }

  const beforeTime =
    text.match(
      /\b([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50}(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]{2,50})?)\s+\d{1,2}:\d{2}\b/u
    );


  if (beforeTime?.[1]) {

    const candidate =
      normalize(beforeTime[1]);

    if (candidate) {
      return candidate;
    }
  }


  /*
    ========================================================
    13. ВІДОМІ ВЕЛИКІ ГЕОГРАФІЧНІ РЕГІОНИ

    Це не список міст.
    Лише великі сталі назви,
    які часто зустрічаються у туристичних постах.
    ========================================================
  */

  const broadPlaces = [

    ["Delta Dunării", "Delta Dunării"],
    ["Delta Dunarii", "Delta Dunării"],

    ["Piatra Craiului", "Piatra Craiului"],

    ["Munții Bucegi", "Munții Bucegi"],
    ["Muntii Bucegi", "Munții Bucegi"],
    ["Bucegi Mountains", "Munții Bucegi"],

    ["Munții Apuseni", "Munții Apuseni"],
    ["Muntii Apuseni", "Munții Apuseni"],
    ["Apuseni", "Apuseni"],

    ["Maramureș", "Maramureș"],
    ["Maramures", "Maramureș"],

    ["Bucovina", "Bucovina"],

    ["Valea Oltului", "Valea Oltului"]

  ];


  const lowerText =
    text.toLowerCase();


  for (
    const [searchValue, outputValue]
    of broadPlaces
  ) {

    if (
      lowerText.includes(
        searchValue.toLowerCase()
      )
    ) {
      return outputValue;
    }
  }


  /*
    ========================================================
    14. COMUNA / ORAȘUL / MUNICIPIUL / SATUL
    ========================================================
  */

  const administrativePlace =
    text.match(
      /\b(?:Comuna|Orașul|Orasul|Municipiul|Satul)\s+([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:\s+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,3})/u
    );


  if (administrativePlace?.[1]) {

    const candidate =
      normalize(
        administrativePlace[1]
      );

    if (candidate) {
      return candidate;
    }
  }





  /*
    ========================================================
    16. JUDEȚ

    ТІЛЬКИ останній локальний fallback.

    Тобто якщо є:
      Zărnești, Jud Brașov

    Zărnești вже мав спрацювати вище.

    Якщо є тільки:
      jud. Caraș-Severin

    тоді вже повертаємо Caraș-Severin.
    ========================================================
  */

  const county =
    text.match(
      /\b(?:Județul|Judetul|Județ|Judet|Jud\.?)\s+([A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+(?:[\s-]+[A-ZĂÂÎȘȚŞŢ][A-Za-zĂÂÎȘȚŞŢăâîșțşţ'’\-]+){0,2})/u
    );


  if (county?.[1]) {

    const candidate =
      normalize(county[1]);

    if (candidate) {
      return candidate;
    }
  }


  /*
    Нічого достатньо надійного немає.
    Тоді вже processFacebookItemForModeration()
    може викликати findLocationOnline().
  */

  return "";
}


/* =========================================================
   TELEGRAM CAPTION
========================================================= */

function makeCaption(
  location
) {

  const safe =
    clean(
      location || ""
    );


  if (!safe) {

    return (
      `<b><a href="https://t.me/romania_lovers">🇷🇴 Discover Romania</a></b>`
    );
  }


  return (

    `📍 ${safe}\n\n` +

    `<b><a href="https://t.me/romania_lovers">🇷🇴 Discover Romania</a></b>`

  );
}


/* =========================================================
   FACEBOOK MODERATION / QUEUE
========================================================= */

const FACEBOOK_SLOTS = {

  "05": {
    start: 5,
    end: 7
  },

  "07": {
    start: 7,
    end: 17
  },

  "18": {
    start: 18,
    end: 21
  },

  "21": {
    start: 21,
    end: 24
  }

};


const FACEBOOK_PENDING_PREFIX =
  "facebook:pending:";

const FACEBOOK_QUEUE_PREFIX =
  "facebook:queue:";

const FACEBOOK_QUEUE_INDEX =
  "facebook:queue:index";

const FACEBOOK_CONTROL_PREFIX =
  "facebook:control:";


/*
   За один Cron максимум
   два нових Facebook-пости.
*/
const MAX_FACEBOOK_PER_CRON =
  2;

/*
   Скільки RSS перевіряємо
   за один 5-хвилинний Cron.
*/
const FEEDS_PER_CRON =
  3;

function facebookPendingKey(
  id
) {

  return (
    FACEBOOK_PENDING_PREFIX +
    id
  );
}


function facebookQueueKey(
  id
) {

  return (
    FACEBOOK_QUEUE_PREFIX +
    id
  );
}


function facebookControlKey(
  chatId,
  messageId
) {

  return (
    FACEBOOK_CONTROL_PREFIX +
    chatId +
    ":" +
    messageId
  );
}


function escapeHtml(
  value
) {

  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );
}


/* =========================================================
   FACEBOOK VIDEO DOWNLOAD
========================================================= */

async function downloadFacebookVideo(
  facebookUrl
) {

  try {

    const response =
      await fetch(
        `${VIDEO_API}/download`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify({

              url:
                facebookUrl

            })

        }
      );


    if (
      !response.ok
    ) {

      return null;
    }


    const data =
      await response.json();


    if (
      !data.ok
    ) {

      return null;
    }


    const video =

      data.video_url ||

      data.video ||

      data.url;


    if (!video) {

      return null;
    }


    if (
      video.startsWith(
        "http"
      )
    ) {

      return video;
    }


    return (
      VIDEO_API +
      video
    );

  } catch {

    return null;
  }
}


/* =========================================================
   MODERATION BUTTONS
========================================================= */

function moderationKeyboard(
  itemId
) {

  return {
    inline_keyboard: [

      [
        {
          text:
            "🌅 05:00–07:00",

          callback_data:
            `fb:range:05:${itemId}`
        }
      ],

      [
        {
          text:
            "☀️ 07:30–17:00",

          callback_data:
            `fb:range:07:30:${itemId}`
        }
      ],

      [
        {
          text:
            "🌇 18:00–21:00",

          callback_data:
            `fb:range:18:${itemId}`
        }
      ],

      [
        {
          text:
            "🌙 21:00–00:00",

          callback_data:
            `fb:range:21:${itemId}`
        }
      ],

      [
        {
          text:
            "🚀 Опублікувати зараз",

          callback_data:
            `fb:publish:${itemId}`
        }
      ],

      [
        {
          text:
            "❌ Відхилити",

          callback_data:
            `fb:no:${itemId}`
        }
      ]

    ]
  };
}

const FACEBOOK_EXACT_TIMES = {

  "05": [
    "05:00",
    "05:30",
    "06:00",
    "06:30",
    "07:00"
  ],

  "07": [
    "07:30",
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00"
  ],

  "18": [
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00"
  ],

  "21": [
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
    "00:00"
  ]

};


async function exactTimeKeyboard(
  env,
  rangeId,
  itemId
) {

  const times =
    FACEBOOK_EXACT_TIMES[
      rangeId
    ] || [];


  /*
     Читаємо всі уже заплановані пости.
  */


  const existingItems =
    await listFacebookQueueItems(
      env
    );


  const occupied =
    new Set(
      existingItems.map(
        item =>
          Number(
            item.scheduledAt
          )
      )
    );


  /*
     Поточна дата саме за Europe/Bucharest.

     У коді scheduledAt зберігається
     у такому ж "локальному pseudo UTC" форматі,
     тому порівнюємо напряму.
  */

  const now =
    new Date(
      getLocalPseudoNow()
    );


  const rows = [];


  const buttons =
    times.map(
      time => {

        const [
          hourText,
          minuteText
        ] =
          time.split(":");


        const hour =
          Number(
            hourText
          );


        const minute =
          Number(
            minuteText
          );


        /*
           Timestamp цього часу СЬОГОДНІ.
        */

        const target =
          new Date(
            Date.UTC(

              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate(),

              hour,
              minute,

              0,
              0
            )
          );


        /*
           Для кнопки 00:00 у вечірньому
           діапазоні мається на увазі
           найближча наступна північ.
        */

        if (
          time === "00:00"
        ) {

          target.setUTCDate(
            target.getUTCDate() +
            1
          );
        }


        const isOccupied =
          occupied.has(
            target.getTime()
          );


        return {

          text:
            isOccupied
              ? `✓ ${time}`
              : time,

          callback_data:
            `fb:time:${time}:${itemId}`

        };
      }
    );


  /*
     По 3 кнопки часу в ряд.
  */

  for (
    let i = 0;
    i < buttons.length;
    i += 3
  ) {

    rows.push(
      buttons.slice(
        i,
        i + 3
      )
    );
  }


  rows.push([

    {
      text:
        "⬅️ Назад",

      callback_data:
        `fb:back:${itemId}`
    }

  ]);


  rows.push([

    {
      text:
        "❌ Відхилити",

      callback_data:
        `fb:no:${itemId}`
    }

  ]);


  return {
    inline_keyboard:
      rows
  };
}

async function editMessageKeyboard(
  env,
  chatId,
  messageId,
  keyboard
) {

  return await telegramJson(
    env,
    "editMessageReplyMarkup",
    {

      chat_id:
        chatId,

      message_id:
        messageId,

      reply_markup:
        keyboard

    }
  );
}

/* =========================================================
   ADMIN CAPTION
========================================================= */

function makeAdminCaption(
  item
) {

  const parts = [

  "📘 <b>Facebook</b>"

];


  if (
    item.location
  ) {

    parts.push(
      "",
      `📍 ${escapeHtml(
        item.location
      )}`
    );
  }

  if (
    item.originalLocation &&
    item.location &&
    item.originalLocation !== item.location
  ) {

    parts.push(
      `↳ з посту: ${escapeHtml(
        item.originalLocation
      )}`
    );
  }

  if (
    item.title
  ) {

    parts.push(

      "",

      `📝 ${escapeHtml(
        item.title
      )}`

    );
  }


  parts.push(

    "",

    `<a href="${escapeHtml(
      item.facebookUrl
    )}">Відкрити оригінальний пост</a>`

  );


  return parts.join(
    "\n"
  );
}


/* =========================================================
   TELEGRAM JSON
========================================================= */

async function telegramJson(
  env,
  method,
  body
) {

  const response =
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/json"

        },

        body:
          JSON.stringify(
            body
          )

      }
    );


  return await response.json();
}


/* =========================================================
   SEND MEDIA TO ADMIN
========================================================= */

async function telegramMultipart(
  env,
  method,
  formData
) {

  const response =
    await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
      {
        method: "POST",
        body: formData
      }
    );


  return await response.json();
}

function getFacebookMediaProxyUrl(
  mediaUrl
) {

  const proxyUrl =
    "https://facebook-rss.onrender.com/image?url=" +
    encodeURIComponent(
      mediaUrl
    );

  console.log(
    "MEDIA PROXY URL:",
    proxyUrl
  );

  return proxyUrl;
}

async function sendAdminPhoto(
  env,
  photoUrl,
  item
) {

  try {

    const proxyUrl =
      getFacebookMediaProxyUrl(
        photoUrl
      );


    console.log(
      "TELEGRAM PHOTO VIA PROXY:",
      proxyUrl
    );


    const response =
      await telegramJson(
        env,
        "sendPhoto",
        {

          chat_id:
            ADMIN_CHAT_ID,

          photo:
            proxyUrl,

          caption:
            makeAdminCaption(
              item
            ),

          parse_mode:
            "HTML",

          reply_markup:
            moderationKeyboard(
              item.id
            )

        }
      );


    console.log(
      "TELEGRAM PHOTO RESULT:",
      JSON.stringify(
        response
      )
    );


    return response;


  } catch (error) {

    console.log(
      "SEND ADMIN PHOTO ERROR:",
      String(error)
    );


    return {
      ok: false,
      error:
        String(error)
    };
  }
}


async function sendAdminVideo(
  env,
  videoUrl,
  item
) {

  return await telegramJson(
    env,
    "sendVideo",
    {

      chat_id:
        ADMIN_CHAT_ID,

      video:
        videoUrl,

      caption:
        makeAdminCaption(
          item
        ),

      parse_mode:
        "HTML",

      supports_streaming:
        true,

      reply_markup:
        moderationKeyboard(item.id)

    }
  );
}

async function sendAdminAlbum(
  env,
  photos,
  item
) {

  try {

    const urls =
      photos
        .slice(
          0,
          10
        )
        .map(
          photoUrl =>
            getFacebookMediaProxyUrl(
              photoUrl
            )
        );


    if (
      urls.length === 0
    ) {

      return {
        ok: false,
        error:
          "Немає фото для альбому"
      };
    }


    /*
       Якщо фото одне —
       відправляємо звичайним sendPhoto.
    */

    if (
      urls.length === 1
    ) {

      return await telegramJson(
        env,
        "sendPhoto",
        {

          chat_id:
            ADMIN_CHAT_ID,

          photo:
            urls[0],

          caption:
            makeAdminCaption(
              item
            ),

          parse_mode:
            "HTML"

        }
      );
    }


    const media =
      urls.map(
        (url, index) => {

          const entry = {

            type:
              "photo",

            media:
              url

          };


          if (
            index === 0
          ) {

            entry.caption =
              makeAdminCaption(
                item
              );

            entry.parse_mode =
              "HTML";
          }


          return entry;
        }
      );


    console.log(
      "TELEGRAM ALBUM URLS:",
      urls.length
    );


    const response =
      await telegramJson(
        env,
        "sendMediaGroup",
        {

          chat_id:
            ADMIN_CHAT_ID,

          media

        }
      );


    console.log(
      "TELEGRAM ALBUM RESULT:",
      JSON.stringify(
        response
      )
    );


    return response;


  } catch (error) {

    console.log(
      "SEND ADMIN ALBUM ERROR:",
      String(error)
    );


    return {
      ok: false,
      error:
        String(error)
    };
  }
}


/* =========================================================
   SEND CONTROLS
========================================================= */

async function sendModerationControls(
  env,
  item
) {

  let mediaInfo =
    "🖼 Фото";

  if (
    item.mediaType === "album"
  ) {

    mediaInfo =
      `🖼 Альбом: ${
        item.mediaUrls?.length || 0
      } фото`;

  } else if (
    item.mediaType === "video"
  ) {

    mediaInfo =
      "🎥 Відео";
  }


  const textParts = [

    "Оберіть час публікації:",
    "",
    mediaInfo

  ];


  if (
    item.location
  ) {

    textParts.push(
      "",
      `📍 ${escapeHtml(
        item.location
      )}`
    );
  }


  const text =
    textParts.join(
      "\n"
    );


  const response =
    await telegramJson(
      env,
      "sendMessage",
      {
        chat_id:
          ADMIN_CHAT_ID,

        text,

        parse_mode:
          "HTML",

        reply_markup:
          moderationKeyboard(item.id)
      }
    );


  if (!response.ok) {
    return response;
  }


  await env.CHARIVNA_ROMANIA.put(
    facebookControlKey(
      response.result.chat.id,
      response.result.message_id
    ),
    item.id
  );


  return response;
}

function getLocalPseudoNow() {

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Bucharest",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23"
      }
    )
      .formatToParts(
        new Date()
      );


  const values = {};


  for (
    const part
    of parts
  ) {

    values[
      part.type
    ] =
      part.value;
  }


  return Date.UTC(

    Number(values.year),

    Number(values.month) - 1,

    Number(values.day),

    Number(values.hour),

    Number(values.minute),

    Number(values.second),

    0

  );
}


function getNextExactTimestamp(
  time,
  occupied
) {

  const [
    hourText,
    minuteText
  ] =
    time.split(":");


  const hour =
    Number(
      hourText
    );


  const minute =
    Number(
      minuteText
    );


  const now =
    new Date(
      getLocalPseudoNow()
    );


  /*
     Робимо сьогоднішній
     вибраний час.
  */

  let target =
    new Date(
      Date.UTC(

        now.getUTCFullYear(),

        now.getUTCMonth(),

        now.getUTCDate(),

        hour,

        minute,

        0,

        0

      )
    );


  /*
     00:00 у кнопці 21–00
     означає наступну північ.
  */

  if (
    time === "00:00"
  ) {

    target.setUTCDate(
      target.getUTCDate() +
      1
    );
  }


  /*
     Якщо цей час уже минув —
     наступний день.
  */

  if (
    target.getTime() <=
    now.getTime()
  ) {

    target.setUTCDate(
      target.getUTCDate() +
      1
    );
  }


  /*
     Якщо цей конкретний час
     уже зайнятий —
     НЕ переходимо на +30 хв.

     Переходимо саме
     на цей час наступного дня.
  */

  for (
    let attempt = 0;
    attempt < 365;
    attempt++
  ) {

    const timestamp =
      target.getTime();


    if (
      !occupied.has(
        timestamp
      )
    ) {

      return timestamp;
    }


    target.setUTCDate(
      target.getUTCDate() +
      1
    );
  }


  return null;
}


async function listFacebookQueueItems(
  env
) {

  const result =
    await env.CHARIVNA_ROMANIA.list({
      prefix:
        FACEBOOK_QUEUE_PREFIX
    });


  const items = [];


  for (
    const key
    of result.keys
  ) {

    /*
       Старий facebook:queue:index
       теж підпадає під цей prefix,
       тому його пропускаємо.
    */
    if (
      key.name ===
      FACEBOOK_QUEUE_INDEX
    ) {
      continue;
    }


    const value =
      await env.CHARIVNA_ROMANIA.get(
        key.name
      );


    if (!value) {
      continue;
    }


    try {

      const item =
        JSON.parse(
          value
        );


      if (
        item &&
        item.scheduledAt
      ) {
        items.push(
          item
        );
      }

    } catch {
      continue;
    }
  }


  return items;
}


async function queueFacebookExactTime(
  env,
  pending,
  time
) {


  const existingItems =
    await listFacebookQueueItems(
      env
    );


  const occupied =
    new Set(

      existingItems.map(
        item =>
          Number(
            item.scheduledAt
          )
      )

    );


  const scheduledAt =
    getNextExactTimestamp(
      time,
      occupied
    );


  if (
    !scheduledAt
  ) {

    return {
      ok: false,
      error:
        "Не вдалося знайти вільну дату"
    };
  }


  const queueId =
    (
      await hash(
        pending.id +
        ":" +
        scheduledAt
      )
    ).slice(
      0,
      24
    );


  const queued = {

    ...pending,

    id:
      queueId,

    sourcePendingId:
      pending.id,

    exactTime:
      time,

    scheduledAt,

    queuedAt:
      Date.now()

  };


  await env.CHARIVNA_ROMANIA.put(

    facebookQueueKey(
      queueId
    ),

    JSON.stringify(
      queued
    )

  );


  return {
    ok: true,
    item: queued
  };
}
/* =========================================================
   PENDING
========================================================= */

async function saveFacebookPending(
  env,
  item
) {

  await env.CHARIVNA_ROMANIA.put(

    facebookPendingKey(
      item.id
    ),

    JSON.stringify(
      item
    )

  );
}


async function getFacebookPending(
  env,
  id
) {

  const value =
    await env.CHARIVNA_ROMANIA.get(

      facebookPendingKey(
        id
      )

    );


  if (!value) {

    return null;
  }


  try {

    return JSON.parse(
      value
    );

  } catch {

    return null;
  }
}


async function deleteFacebookPending(
  env,
  id
) {

  await env.CHARIVNA_ROMANIA.delete(

    facebookPendingKey(
      id
    )

  );
}


/* =========================================================
   PROCESS FACEBOOK ITEM FOR MODERATION
========================================================= */
async function findLocationOnline(
  rawItem,
  preferredCandidate = ""
) {

  const text =
    clean(
      rawItem
    );


  if (!text) {
    return "";
  }


  /*
     Беремо кілька коротких фраз,
     які можуть бути назвою місця.
  */

  const candidates = [];

  if (
    preferredCandidate
  ) {

    candidates.push(
      preferredCandidate
    );
  }

  /*
    Хештеги перевіряємо через Nominatim.

    #Constanta -> може стати Constanța
    #Paleu     -> може стати Paleu
    #Zarnesti  -> може стати Zărnești

    #Stiuca / #Nature / #Travel
    не приймаємо автоматично.
  */

  const hashtags =
    [
      ...text.matchAll(
        /#([A-Za-zĂÂÎȘȚŞŢăâîșțşţ\-]{3,60})/gu
      )
    ]
      .map(
        match =>
          match[1]
      )
      .filter(Boolean);


  for (
    const hashtag
    of hashtags
  ) {

    candidates.push(
      hashtag
    );
  }


  const laMatch =
    text.match(
      /\bLa\s+([^.!?,;\n]{3,80})/i
    );


  if (
    laMatch &&
    laMatch[1]
  ) {

    candidates.push(
      laMatch[1].trim()
    );
  }


  const aiciMatch =
    text.match(
      /(?:aici|здесь)\s*:\s*([^.!?,;\n]{3,80})/i
    );


  if (
    aiciMatch &&
    aiciMatch[1]
  ) {

    candidates.push(
      aiciMatch[1].trim()
    );
  }


  /*
     Якщо нічого не знайшли —
     беремо title як запасний варіант.
  */

  const title =
    getTag(
      rawItem,
      "title"
    );


  if (
    title
  ) {

    candidates.push(
      title
    );
  }


  for (
    const candidate
    of candidates
  ) {

    const query =
      candidate +
      ", Romania";


    try {

      const url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=json" +
        "&limit=3" +
        "&countrycodes=ro" +
        "&accept-language=ro" +
        "&addressdetails=1" +
        "&q=" +
        encodeURIComponent(
          query
        );


      const response =
        await fetch(
          url,
          {
            headers: {
              "User-Agent":
                "CharivnaRomaniaBot/1.0"
            }
          }
        );


      if (
        !response.ok
      ) {

        continue;
      }


      const data =
        await response.json();


      if (
        !Array.isArray(
          data
        ) ||
        data.length === 0
      ) {

        continue;
      }


      for (
        const result
        of data
      ) {

        const address =
          result.address ||
          {};


        const placeType =
          String(
            result.type || ""
          ).toLowerCase();


        /*
          Приймаємо тільки населений пункт.

          Не озеро, не ресторан, не вулицю,
          не магазин і не випадковий об'єкт,
          який випадково має таку саму назву.
        */

        const allowedTypes =
          new Set([
            "city",
            "town",
            "village",
            "municipality",
            "hamlet"
          ]);


        if (
          !allowedTypes.has(
            placeType
          )
        ) {
          continue;
        }


        const location =
          address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.hamlet ||
          result.name ||
          "";


        if (
          location
        ) {

          return normalizeLocationSmart(
            location
          );
        }
      }

    } catch {

      continue;
    }
  }


  return "";
}

async function canonicalizeRomanianLocation(
  location
) {

  if (!location) {
    return "";
  }


  let original =
    cleanLocationCandidate(
      location
    );


  if (!original) {
    return "";
  }


  /*
     Прибираємо службові слова,
     які Facebook може дати російською,
     українською або англійською.
  */

  original =
    original
      .replace(
        /^(?:Город|Місто|City|Orașul|Orasul)\s+/iu,
        ""
      )
      .trim();


  /*
     Спочатку наші безпечні локальні
     перетворення.

     Тут нічого не шукаємо —
     лише виправляємо написання.
  */

  const local =
    normalizeLocationSmart(
      original
    );


  /*
     Великі географічні об'єкти
     та типи місць НЕ віддаємо
     Nominatim для заміни на місто.

     Наприклад:
     Vârful Toaca
     Castelul Cantacuzino
     Munții Carpați
     Lacul Bâlea
  */

  if (
    /^(?:Vârful|Varful|Munții|Muntii|Lacul|Castelul|Cetatea|Cascada|Mănăstirea|Manastirea|Cheile|Peștera|Pestera|Valea|Obcina|Masivul|Defileul|Rezervația|Rezervatia|Parcul|Cabana|Chilia|Delta)\b/iu.test(
      local
    )
  ) {

    return local;
  }


  /*
     Питаємо Nominatim саме про
     ВЖЕ знайдену назву.

     countrycodes=ro не дозволяє
     піти за межі Румунії.
  */

  try {

    const url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=jsonv2" +
      "&limit=3" +
      "&countrycodes=ro" +
      "&accept-language=ro" +
      "&addressdetails=1" +
      "&namedetails=1" +
      "&q=" +
      encodeURIComponent(
        local + ", România"
      );


    const response =
      await fetch(
        url,
        {
          headers: {
            "User-Agent":
              "CharivnaRomaniaBot/1.0"
          }
        }
      );


    if (!response.ok) {
      return local;
    }


    const data =
      await response.json();


    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {

      return local;
    }


    const wanted =
      local
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        );


    for (
      const result
      of data
    ) {

      const address =
        result.address || {};


      const countryCode =
        String(
          address.country_code || ""
        ).toLowerCase();


      if (
        countryCode &&
        countryCode !== "ro"
      ) {
        continue;
      }


      const namedetails =
        result.namedetails || {};


      const possibleNames = [

        namedetails["name:ro"],

        result.name,

        address.city,
        address.town,
        address.village,
        address.municipality,
        address.hamlet

      ]
        .filter(Boolean);


      for (
        const name
        of possibleNames
      ) {

        const normalizedName =
          String(name)
            .toLowerCase()
            .normalize("NFD")
            .replace(
              /[\u0300-\u036f]/g,
              ""
            );


        /*
           Не дозволяємо Nominatim
           підмінити місце зовсім
           іншою назвою.

           Constanta ≈ Constanța
           Brasov ≈ Brașov

           але:
           Bușteni != Castelul Cantacuzino
        */

        if (
          normalizedName === wanted
        ) {

          return normalizeLocationSmart(
            name
          );
        }
      }
    }


  } catch (
    error
  ) {

    console.log(
      "ROMANIAN LOCATION NORMALIZE ERROR:",
      String(error)
    );
  }


  /*
     Якщо Nominatim нічого надійного
     не підтвердив — залишаємо
     знайдене ботом місце.
  */

  return local;
}


async function processFacebookItemForModeration(
  env,
  rawItem,
  feed,
  force = false
) {

  const title =
    getTag(
      rawItem,
      "title"
    );


  const description =
    getTag(
      rawItem,
      "description"
    );


  const link =
    getTag(
      rawItem,
      "link"
    );


  const facebookUrl =

    getFacebookUrl(
      rawItem
    ) ||

    getFacebookUrl(
      description
    ) ||

    getFacebookUrl(
      link
    );


  if (
    !facebookUrl
  ) {

    return {

      ok:
        false,

      error:
        "Facebook URL не знайдено"

    };
  }


  /*
     Звичайний Cron:
     published пости не беремо.

     Ручний режим force=true:
     цю перевірку пропускаємо.
  */

  if (
    !force &&
    await isPublished(
      env,
      facebookUrl
    )
  ) {

    return {

      ok:
        true,

      duplicate:
        true

    };
  }


  let location =
    findLocation(
      rawItem,
      feed
    );


  const originalLocation =
    location;


  const needsOnlineLocation =
    !location ||
    location === "Локацію не знайдено";


  if (
    needsOnlineLocation
  ) {

    const onlineLocation =
      await findLocationOnline(
        rawItem,
        location
      );


    if (
      onlineLocation
    ) {

      location =
        onlineLocation;
    }
  }


  /*
     Фінально приводимо знайдену
     назву до румунського написання.
  */

  if (
    location &&
    location !==
      "Локацію не знайдено"
  ) {

    location =
      await canonicalizeRomanianLocation(
        location
      );
  }


  const images =
    getImageUrls(

      rawItem +

      " " +

      description

    );


  const rawLower =
  String(rawItem || "")
    .toLowerCase();

 
   const isVideo =

    facebookUrl.includes(
      "/reel/"
    ) ||

    facebookUrl.includes(
      "/videos/"
    ) ||

    rawLower.includes(
      "<media:content"
    ) && (
      rawLower.includes(
        'medium="video"'
      ) ||
      rawLower.includes(
        "type=\"video/"
      )
    ) ||

    rawLower.includes(
      "<video"
    ) ||

    rawLower.includes(
      "fb-video"
    );


  let mediaType =
    "";

  let videoUrl =
    "";

  let mediaUrls =
    [];


  /*
     VIDEO
  */

  if (
    isVideo
  ) {

    videoUrl =
      await downloadFacebookVideo(
        facebookUrl
      );


    if (
      !videoUrl
    ) {

      /*
         У force-режимі не чіпаємо
         published-статус.
      */

      if (
        !force
      ) {

        await markPublished(
          env,
          facebookUrl
        );
      }


      return {

        ok:
          false,

        skipped:
          true,

        error:
          "Відео не вдалося завантажити"

      };
    }


    mediaType =
      "video";


  /*
     PHOTO / ALBUM
  */

  } else if (
    images.length > 0
  ) {

    mediaType =
      images.length > 1
        ? "album"
        : "photo";


    mediaUrls =
      images.slice(
        0,
        10
      );


  /*
     NO MEDIA
  */

  } else {

    /*
       У ручному force-режимі
       не ставимо retry block.
    */

    if (
      !force
    ) {

      await blockFacebookRetry(
        env,
        facebookUrl,
        3600
      );
    }


    return {

      ok:
        false,

      skipped:
        true,

      error:
        "Медіа не знайдено"

    };
  }


  const idSource =
    force
      ? facebookUrl + ":manual:" + Date.now()
      : facebookUrl;


  const id =
    (
      await hash(
        idSource
      )
    ).slice(
      0,
      24
    );


  const item = {

    id,
    feed,
    facebookUrl,
    title,
    description,
    originalLocation,
    location,
    mediaType,
    mediaUrls,
    videoUrl,

    createdAt:
      Date.now()

  };

  /*
    ВАЖЛИВО:
    pending зберігаємо ДО відправлення кнопок у Telegram.

    Інакше користувач уже бачить кнопку,
    натискає її, а запису в KV ще немає.
  */
  await saveFacebookPending(
    env,
    item
  );


  let telegram;





  /*
     Відправляємо тобі в ЛС.
  */

  if (
    mediaType ===
      "video"
  ) {

    telegram =
      await sendAdminVideo(
        env,
        videoUrl,
        item
      );


  } else if (
    mediaType ===
      "album"
  ) {

    telegram =
      await sendAdminAlbum(
        env,
        mediaUrls,
        item
      );


  } else {

    telegram =
      await sendAdminPhoto(
        env,
        mediaUrls[0],
        item
      );
  }


  if (
    !telegram.ok
  ) {

    return {

      ok:
        false,

      error:
        "Telegram не прийняв Facebook медіа",

      telegram

    };
  }


  /*
     VIDEO file_id
  */

  if (

    mediaType ===
      "video" &&

    telegram.result
      ?.video
      ?.file_id

  ) {

    item.videoUrl =
      telegram.result
        .video
        .file_id;
  }


  /*
     PHOTO file_id
  */

  if (

    mediaType ===
      "photo" &&

    Array.isArray(
      telegram.result
        ?.photo
    ) &&

    telegram.result.photo
      .length > 0

  ) {

    item.mediaUrls = [

      telegram.result.photo[
        telegram.result.photo.length - 1
      ].file_id

    ];
  }


  /*
     ALBUM file_ids
  */

  if (

    mediaType ===
      "album" &&

    Array.isArray(
      telegram.result
    )

  ) {

    const telegramPhotos =

      telegram.result
        .map(
          message => {

            const photos =
              message.photo || [];


            if (
              photos.length === 0
            ) {

              return null;
            }


            return photos[
              photos.length - 1
            ].file_id;

          }
        )
        .filter(
          Boolean
        );


    if (
      telegramPhotos.length >
      0
    ) {

      item.mediaUrls =
        telegramPhotos;
    }
  }


  /*
     Зберігаємо pending.
  */

  await saveFacebookPending(
    env,
    item
  );


  /*
     Для альбому кнопки окремо.
  */

  if (
    mediaType ===
      "album"
  ) {

    await sendModerationControls(
      env,
      item
    );

  } else {

    const moderationMessage =
      telegram.result;


    if (
      moderationMessage &&
      moderationMessage.message_id
    ) {

      await env.CHARIVNA_ROMANIA.put(

        facebookControlKey(
          moderationMessage.chat.id,
          moderationMessage.message_id
        ),

        item.id

      );
    }
  }


  /*
     У звичайному Cron:
     записуємо published.

     У force=true:
     НЕ чіпаємо published,
     бо це ручне відновлення.
  */

  if (
    !force
  ) {

    await markPublished(
      env,
      facebookUrl
    );
  }


  return {

    ok:
      true,

    moderation:
      true,

    id,

    mediaType,

    location,

    facebookUrl

  };
}


/* =========================================================
   FIND NEW FACEBOOK POSTS
========================================================= */

async function findNewFacebookItems(
  env,
  scheduledTime = Date.now()
) {

  const found =
    [];

  const localSeen =
    new Set();


  /*
     Не перевіряємо всі RSS
     одним запуском.

     Cron іде кожні 5 хвилин.
     Беремо наступну пачку
     по FEEDS_PER_CRON джерел.
  */

  const batchCount =
    Math.ceil(
      FEEDS.length /
      FEEDS_PER_CRON
    );


  const cronNumber =
    Math.floor(
      Number(scheduledTime) /
      (
        5 *
        60 *
        1000
      )
    );


  const batchIndex =
    cronNumber %
    batchCount;


  const startIndex =
    batchIndex *
    FEEDS_PER_CRON;


  const endIndex =
    Math.min(
      startIndex +
      FEEDS_PER_CRON,
      FEEDS.length
    );


  console.log(
    "RSS BATCH:",
    batchIndex + 1,
    "/",
    batchCount,
    "feeds",
    startIndex + 1,
    "-",
    endIndex
  );


  for (
    let i = startIndex;
    i < endIndex;
    i++
  ) {

    let response;


    console.log(
      "CHECKING FEED:",
      i + 1,
      FEEDS[i]
    );


    try {

      response =
        await fetch(
          FEEDS[i],
          {
            headers: {
              "User-Agent":
                "CharivnaRomaniaBot/1.0"
            }
          }
        );

    } catch (error) {

      console.log(
        "FEED FETCH ERROR:",
        i + 1,
        FEEDS[i],
        String(error)
      );

      continue;
    }


    if (
      !response.ok
    ) {

      console.log(
        "FEED HTTP ERROR:",
        i + 1,
        response.status,
        FEEDS[i]
      );

      continue;
    }


    const xml =
      await response.text();


    const items =
      getAllItems(
        xml
      );


    console.log(
      "FEED RESULT:",
      i + 1,
      "items=" + items.length
    );


    for (
      const item
      of items
    ) {

      const description =
        getTag(
          item,
          "description"
        );


      const link =
        getTag(
          item,
          "link"
        );


      const facebookUrl =

        getFacebookUrl(
          item
        ) ||

        getFacebookUrl(
          description
        ) ||

        getFacebookUrl(
          link
        );


      if (
        !facebookUrl
      ) {

        console.log(
          "SKIP NO FACEBOOK URL:",
          "feed=" + (i + 1)
        );

        continue;
      }


      if (
        localSeen.has(
          facebookUrl
        )
      ) {

        continue;
      }


      localSeen.add(
        facebookUrl
      );


      if (
        await isPublished(
          env,
          facebookUrl
        )
      ) {

        console.log(
          "SKIP PUBLISHED:",
          "feed=" + (i + 1),
          facebookUrl
        );

        continue;
      }


      if (
        await isFacebookRetryBlocked(
          env,
          facebookUrl
        )
      ) {

        console.log(
          "SKIP RETRY BLOCK:",
          "feed=" + (i + 1),
          facebookUrl
        );

        continue;
      }


      found.push({
        item,
        feed:
          i + 1,
        facebookUrl
      });


      /*
         Нам не потрібно збирати
         десятки нових постів
         за один Cron.
      */

      if (
        found.length >=
        MAX_FACEBOOK_PER_CRON
      ) {

        console.log(
          "FACEBOOK CRON LIMIT REACHED:",
          found.length
        );

        return found;
      }
    }
  }


  return found;
}


/* =========================================================
   ROMANIA LOCAL TIME
========================================================= */

function getRomaniaDate() {

  const now =
    new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Europe/Bucharest",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",

        hourCycle:
          "h23"
      }
    )
      .formatToParts(now);


  const values = {};

  for (
    const part
    of parts
  ) {

    values[
      part.type
    ] =
      part.value;
  }


  return {

    year:
      Number(
        values.year
      ),

    month:
      Number(
        values.month
      ),

    day:
      Number(
        values.day
      ),

    hour:
      Number(
        values.hour
      ),

    minute:
      Number(
        values.minute
      ),

    second:
      Number(
        values.second
      )

  };
}


/* =========================================================
   GET NEXT FREE SLOT
========================================================= */

function getNextSlotTimestamp(
  slotId,
  occupied
) {

  const slot =
    FACEBOOK_SLOTS[
      slotId
    ];


  if (!slot) {
    return null;
  }


  const localNow =
    getRomaniaDate();


  /*
     Робимо дату, де цифри
     відповідають саме локальному
     часу Румунії.

     Тут UTC використовується
     лише як "контейнер цифр",
     а не як реальний часовий пояс.
  */

  let target =
    new Date(
      Date.UTC(
        localNow.year,
        localNow.month - 1,
        localNow.day,
        localNow.hour,
        localNow.minute,
        0,
        0
      )
    );


  let hour =
    target.getUTCHours();

  let minute =
    target.getUTCMinutes();


  /*
     Якщо обраний проміжок
     ще сьогодні не почався.
  */

  if (
    hour <
    slot.start
  ) {

    target.setUTCHours(
      slot.start,
      0,
      0,
      0
    );

  } else {

    /*
       Якщо ми вже всередині
       потрібного проміжку —
       найближчі :00 / :30.
    */

    if (
      minute < 30
    ) {

      target.setUTCMinutes(
        30,
        0,
        0
      );

    } else {

      target.setUTCHours(
        hour + 1,
        0,
        0,
        0
      );
    }
  }


  /*
     Якщо зараз уже ПІЗНІШЕ
     обраного проміжку —
     наступний день.
  */

  if (
    target.getUTCHours() >=
    slot.end
  ) {

    target.setUTCDate(
      target.getUTCDate() +
      1
    );

    target.setUTCHours(
      slot.start,
      0,
      0,
      0
    );
  }


  /*
     Шукаємо перше
     незайняте місце.
  */

  for (
    let attempt = 0;
    attempt < 200;
    attempt++
  ) {

    const timestamp =
      target.getTime();


    if (
      !occupied.has(
        timestamp
      )
    ) {

      return timestamp;
    }


    /*
       Наступні 30 хвилин.
    */

    if (
      target.getUTCMinutes() ===
      0
    ) {

      target.setUTCMinutes(
        30,
        0,
        0
      );

    } else {

      target.setUTCHours(
        target.getUTCHours() +
        1,
        0,
        0,
        0
      );
    }


    /*
       Перейшли за кінець
       обраного періоду —
       завтра з початку.
    */

    if (
      target.getUTCHours() >=
      slot.end
    ) {

      target.setUTCDate(
        target.getUTCDate() +
        1
      );

      target.setUTCHours(
        slot.start,
        0,
        0,
        0
      );
    }
  }


  return null;
}


/* =========================================================
   QUEUE INDEX
========================================================= */

async function readQueueIndex(
  env
) {

  const value =
    await env.CHARIVNA_ROMANIA.get(
      FACEBOOK_QUEUE_INDEX
    );


  if (!value) {

    return [];
  }


  try {

    const ids =
      JSON.parse(
        value
      );


    return Array.isArray(
      ids
    )
      ? ids
      : [];

  } catch {

    return [];
  }
}


async function writeQueueIndex(
  env,
  ids
) {

  await env.CHARIVNA_ROMANIA.put(

    FACEBOOK_QUEUE_INDEX,

    JSON.stringify(
      ids
    )

  );
}


/* =========================================================
   GET QUEUE ITEMS
========================================================= */

async function getQueueItems(
  env,
  ids
) {

  const items =
    [];


  for (
    const id
    of ids
  ) {

    const value =
      await env.CHARIVNA_ROMANIA.get(

        facebookQueueKey(
          id
        )

      );


    if (!value) {

      continue;
    }


    try {

      const item =
        JSON.parse(
          value
        );


      if (

        item &&

        item.scheduledAt

      ) {

        items.push(
          item
        );
      }

    } catch {

      continue;
    }
  }


  return items;
}


/* =========================================================
   QUEUE FACEBOOK ITEM
========================================================= */

async function queueFacebookItem(
  env,
  pending,
  slotId
) {

  const ids =
    await readQueueIndex(
      env
    );


  const existingItems =
    await getQueueItems(
      env,
      ids
    );


  const occupied =
    new Set(

      existingItems.map(
        item =>
          Number(
            item.scheduledAt
          )
      )

    );


  const scheduledAt =
    getNextSlotTimestamp(
      slotId,
      occupied
    );


  if (
    !scheduledAt
  ) {

    return {

      ok:
        false,

      error:
        "Не вдалося знайти вільний час"

    };
  }


  const queueId =
    (
      await hash(

        pending.id +

        ":" +

        scheduledAt

      )
    ).slice(
      0,
      24
    );


  const queued = {

    ...pending,

    id:
      queueId,

    sourcePendingId:
      pending.id,

    slot:
      slotId,

    scheduledAt,

    queuedAt:
      Date.now()

  };


  await env.CHARIVNA_ROMANIA.put(

    facebookQueueKey(
      queueId
    ),

    JSON.stringify(
      queued
    )

  );


  if (
    !ids.includes(
      queueId
    )
  ) {

    ids.push(
      queueId
    );


    await writeQueueIndex(
      env,
      ids
    );
  }


  return {

    ok:
      true,

    item:
      queued

  };
}


/* =========================================================
   FORMAT SCHEDULE
========================================================= */

function formatScheduledAt(
  timestamp
) {

  const date =
    new Date(
      timestamp
    );


  const day =
    String(
      date.getUTCDate()
    ).padStart(
      2,
      "0"
    );


  const month =
    String(
      date.getUTCMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const year =
    date.getUTCFullYear();


  const hour =
    String(
      date.getUTCHours()
    ).padStart(
      2,
      "0"
    );


  const minute =
    String(
      date.getUTCMinutes()
    ).padStart(
      2,
      "0"
    );


  return (

    `${day}.${month}.${year} о ` +

    `${hour}:${minute}`

  );
}


/* =========================================================
   SEND TO CHANNEL
========================================================= */

async function sendPhotoToChannel(
  env,
  photoUrl,
  location
) {

  return await telegramJson(
    env,
    "sendPhoto",
    {

      chat_id:
        TELEGRAM_CHAT_ID,

      photo:
        photoUrl,

      caption:
        makeCaption(
          location
        ),

      parse_mode:
        "HTML"

    }
  );
}


async function sendVideoToChannel(
  env,
  videoUrl,
  location
) {

  return await telegramJson(
    env,
    "sendVideo",
    {

      chat_id:
        TELEGRAM_CHAT_ID,

      video:
        videoUrl,

      caption:
        makeCaption(
          location
        ),

      parse_mode:
        "HTML",

      supports_streaming:
        true

    }
  );
}


async function sendAlbumToChannel(
  env,
  photos,
  location
) {

  const media =
    photos
      .slice(
        0,
        10
      )
      .map(
        (
          url,
          index
        ) => {

          const item = {

            type:
              "photo",

            media:
              url

          };


          if (
            index === 0
          ) {

            item.caption =
              makeCaption(
                location
              );


            item.parse_mode =
              "HTML";
          }


          return item;
        }
      );


  return await telegramJson(
    env,
    "sendMediaGroup",
    {

      chat_id:
        TELEGRAM_CHAT_ID,

      media

    }
  );
}


/* =========================================================
   PUBLISH ONE QUEUE ITEM
========================================================= */

async function publishOneFacebookQueueItem(
  env
) {

  const items =
    await listFacebookQueueItems(
      env
    );


  if (
    items.length === 0
  ) {

    return {
      ok: true,
      published: false
    };
  }


  items.sort(

    (a, b) =>

      a.scheduledAt -

      b.scheduledAt

  );


  const nowLocal =
    getRomaniaDate();

  const nowTimestamp =
    Date.UTC(
      nowLocal.year,
      nowLocal.month - 1,
      nowLocal.day,
      nowLocal.hour,
      nowLocal.minute,
      nowLocal.second
    );

  const due =
    items.find(
      item =>
        item.scheduledAt <=
        nowTimestamp
    );


  if (!due) {

    return {

      ok:
        true,

      published:
        false

    };
  }


  let telegram;


  if (
    due.mediaType ===
    "video"
  ) {

    telegram =
      await sendVideoToChannel(
        env,
        due.videoUrl,
        due.location
      );


  } else if (
    due.mediaType ===
    "album"
  ) {

    telegram =
      await sendAlbumToChannel(
        env,
        due.mediaUrls,
        due.location
      );


  } else {

    telegram =
      await sendPhotoToChannel(
        env,
        due.mediaUrls[0],
        due.location
      );
  }


  if (
    !telegram.ok
  ) {

    return {

      ok:
        false,

      published:
        false,

      error:
        "Telegram не прийняв запланований Facebook пост",

      telegram

    };
  }


  await env.CHARIVNA_ROMANIA.delete(

    facebookQueueKey(
      due.id
    )

  );

  return {

    ok:
      true,

    published:
      true,

    item:
      due

  };
}


/* =========================================================
   CALLBACK ANSWER
========================================================= */

async function answerCallback(
  env,
  callbackQueryId,
  text
) {

  try {

    await telegramJson(
      env,
      "answerCallbackQuery",
      {

        callback_query_id:
          callbackQueryId,

        text:
          text || "",

        show_alert:
          false

      }
    );

  } catch {

    /*
       Не критично.
    */

  }
}


/* =========================================================
   EDIT CONTROL MESSAGE
========================================================= */

async function editModerationCaption(
  env,
  chatId,
  messageId,
  text
) {

  try {

    return await telegramJson(
      env,
      "editMessageCaption",
      {
        chat_id:
          chatId,

        message_id:
          messageId,

        caption:
          text,

        parse_mode:
          "HTML",

        reply_markup: {
          inline_keyboard: []
        }
      }
    );

  } catch {

    return null;
  }
}

async function editModerationText(
  env,
  chatId,
  messageId,
  text
) {

  try {

    return await telegramJson(
      env,
      "editMessageText",
      {
        chat_id:
          chatId,

        message_id:
          messageId,

        text,

        parse_mode:
          "HTML",

        reply_markup: {
          inline_keyboard: []
        }
      }
    );

  } catch (error) {

    console.log(
      "EDIT MODERATION TEXT ERROR:",
      String(error)
    );

    return null;
  }
}

/* =========================================================
   CALLBACK HANDLER
========================================================= */

async function handleCallbackQuery(
  env,
  callbackQuery
) {

  const data =
    callbackQuery.data || "";


  if (
    !data.startsWith(
      "fb:"
    )
  ) {

    return {
      ok: true,
      ignored: true
    };
  }


  /*
    Одразу повідомляємо Telegram,
    що натискання отримано.
  */

  await answerCallback(
    env,
    callbackQuery.id,
    ""
  );


  const message =
    callbackQuery.message;


  if (!message) {

    return {
      ok: false,
      error:
        "Повідомлення не знайдено"
    };
  }


  const chatId =
    message.chat.id;


  const messageId =
    message.message_id;


  /*
     Розбираємо callback_data.

     fb:range:05:ITEM_ID
     fb:time:05:00:ITEM_ID
     fb:back:ITEM_ID
     fb:no:ITEM_ID
  */

  const parts =
    data.split(
      ":"
    );


  let pendingId =
    "";


  if (
    parts[1] ===
      "range" &&
    parts.length >= 4
  ) {

    pendingId =
      parts[
        parts.length - 1
      ];

  } else if (
    parts[1] ===
      "time" &&
    parts.length >= 5
  ) {

    pendingId =
      parts[
        parts.length - 1
      ];

  } else if (
    (
      parts[1] === "back" ||
      parts[1] === "no" ||
      parts[1] === "publish"
    ) &&
    parts.length >= 3
  ) {

    pendingId =
      parts[
        parts.length - 1
      ];
  }


  /*
     Сумісність зі старими кнопками.
  */

  const controlKey =
    facebookControlKey(
      chatId,
      messageId
    );


  if (
    !pendingId
  ) {

    pendingId =
      await env.CHARIVNA_ROMANIA.get(
        controlKey
      ) || "";
  }


  if (
    !pendingId
  ) {

    return {
      ok: false,
      error:
        "Цей пост уже оброблено."
    };
  }


  const pending =
    await getFacebookPending(
      env,
      pendingId
    );


  if (!pending) {

    return {
      ok: false,
      error:
        "Запис не знайдено."
    };
  }


  /*
     ОПУБЛІКУВАТИ ЗАРАЗ
  */

  if (
    data.startsWith(
      "fb:publish:"
    )
  ) {

    let telegram;

    try {

      if (
        pending.mediaType ===
          "video"
      ) {

        telegram =
          await sendVideoToChannel(
            env,
            pending.videoUrl,
            pending.location
          );

      } else if (
        pending.mediaType ===
          "album"
      ) {

        telegram =
          await sendAlbumToChannel(
            env,
            pending.mediaUrls,
            pending.location
          );

      } else {

        telegram =
          await sendPhotoToChannel(
            env,
            pending.mediaUrls[0],
            pending.location
          );
      }


      if (
        !telegram ||
        !telegram.ok
      ) {

        await answerCallback(
          env,
          callbackQuery.id,
          "❌ Не вдалося опублікувати"
        );

        return {
          ok: false,
          error:
            "Telegram не прийняв пост",
          telegram
        };
      }


      await deleteFacebookPending(
        env,
        pending.id
      );


      await env.CHARIVNA_ROMANIA.delete(
        controlKey
      );


      let confirmation =
        "✅ <b>Опубліковано зараз</b>";

      if (
        pending.location
      ) {

        confirmation +=
          `\n\n📍 ${escapeHtml(
            pending.location
          )}`;
      }


      if (
        pending.mediaType ===
          "album"
      ) {

        await editModerationText(
          env,
          chatId,
          messageId,
          confirmation
        );

      } else {

        await editModerationCaption(
          env,
          chatId,
          messageId,
          confirmation
        );
      }


      return {
        ok: true,
        publishedNow: true
      };

    } catch (
      error
    ) {

      console.log(
        "PUBLISH NOW ERROR:",
        String(error)
      );


      await answerCallback(
        env,
        callbackQuery.id,
        "❌ Помилка публікації"
      );


      return {
        ok: false,
        error:
          String(error)
      };
    }
  }
  
  /*
     1. ОБРАЛИ ПРОМІЖОК
  */

  if (
    data.startsWith(
      "fb:range:"
    )
  ) {

    const rangeId =
      parts[2];


    if (
      !FACEBOOK_EXACT_TIMES[
        rangeId
      ]
    ) {

      return {
        ok: false,
        error:
          "Невідомий проміжок"
      };
    }


    await editMessageKeyboard(
      env,
      chatId,
      messageId,
      await exactTimeKeyboard(
        env,
        rangeId,
        pending.id
      )
    );


    return {
      ok: true,
      chooseTime: true,
      rangeId
    };
  }


  /*
     2. НАЗАД
  */

  if (
    data.startsWith(
      "fb:back"
    )
  ) {

    await editMessageKeyboard(
      env,
      chatId,
      messageId,
      moderationKeyboard(
        pending.id
      )
    );


    return {
      ok: true,
      back: true
    };
  }


  /*
     3. ВІДХИЛИТИ
  */

  if (
    data.startsWith(
      "fb:no"
    )
  ) {

    await deleteFacebookPending(
      env,
      pending.id
    );


    await env.CHARIVNA_ROMANIA.delete(
      controlKey
    );


    await editModerationCaption(
      env,
      chatId,
      messageId,
      "❌ <b>Пост відхилено</b>\n\n" +
      (
        pending.location
          ? `📍 ${escapeHtml(
              pending.location
            )}`
          : ""
      )
    );


    return {
      ok: true,
      rejected: true
    };
  }


  /*
     4. КОНКРЕТНИЙ ЧАС
  */

  if (
    data.startsWith(
      "fb:time:"
    )
  ) {

    /*
       fb:time:05:00:ITEM_ID

       parts:
       ["fb","time","05","00","ITEM_ID"]
    */

    const exactTime =
      `${parts[2]}:${parts[3]}`;


    const allowedTimes =
      Object.values(
        FACEBOOK_EXACT_TIMES
      ).flat();


    if (
      !allowedTimes.includes(
        exactTime
      )
    ) {

      return {
        ok: false,
        error:
          "Невідомий час"
      };
    }


    let queued;

    try {

      queued =
        await queueFacebookExactTime(
          env,
          pending,
          exactTime
        );

    } catch (error) {

      console.log(
        "FACEBOOK EXACT TIME ERROR:",
        String(error)
      );


      await telegramJson(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,

          text:
            "⚠️ Не вдалося запланувати пост на " +
            exactTime +
            ".\n\nСпробуй натиснути час ще раз."
        }
      );


      return {
        ok: false,
        error:
          String(error)
      };
    }


    if (
      !queued ||
      !queued.ok
    ) {

      await telegramJson(
        env,
        "sendMessage",
        {
          chat_id:
            chatId,

          text:
            "⚠️ Не вдалося запланувати пост на " +
            exactTime +
            ".\n\n" +
            (
              queued?.error ||
              "Невідома помилка"
            )
        }
      );


      return (
        queued || {
          ok: false,
          error:
            "Невідома помилка"
        }
      );
    }


    /*
       ГОЛОВНЕ:
       пост уже успішно записаний у чергу.

       Тому помилка при очищенні pending/control
       НЕ повинна ламати саме планування.
    */

    try {

      await deleteFacebookPending(
        env,
        pending.id
      );

    } catch (error) {

      console.log(
        "DELETE PENDING AFTER QUEUE ERROR:",
        String(error)
      );
    }


    try {

      await env.CHARIVNA_ROMANIA.delete(
        controlKey
      );

    } catch (error) {

      console.log(
        "DELETE CONTROL AFTER QUEUE ERROR:",
        String(error)
      );
    }


    let confirmation =
      "✅ <b>Заплановано</b>\n\n";


    if (
      pending.location
    ) {

      confirmation +=
        `📍 ${escapeHtml(
          pending.location
        )}\n\n`;
    }


    confirmation +=
      `🕐 Публікація: <b>${formatScheduledAt(
        queued.item.scheduledAt
      )}</b>`;


    try {

      if (
        pending.mediaType ===
          "album"
      ) {

        await editModerationText(
          env,
          chatId,
          messageId,
          confirmation
        );

      } else {

        await editModerationCaption(
          env,
          chatId,
          messageId,
          confirmation
        );
      }

    } catch (error) {

      console.log(
        "EDIT MODERATION AFTER QUEUE ERROR:",
        String(error)
      );
    }


    return {
      ok: true,
      queued: true,
      exactTime,
      item:
        queued.item
    };
  }


  return {
    ok: false,
    unknown: true,
    error:
      "Невідома команда"
  };
}

/* =========================================================
   PRIVATE TELEGRAM
========================================================= */
const MANUAL_RSS_STATE_KEY =
  "manual-rss:state";

const MANUAL_RSS_MAX_POSTS =
  4;


async function testAllRssLocations(
  env,
  chatId
) {

  /*
     Читаємо, де попередній запуск
     "Всі RSS" зупинився.
  */

  let state = {
    feedIndex: 0,
    itemIndex: 0,
    totalSent: 0,
    totalSkipped: 0,
    totalErrors: 0
  };


  try {

    const savedState =
      await env.CHARIVNA_ROMANIA.get(
        MANUAL_RSS_STATE_KEY
      );


    if (savedState) {

      const parsed =
        JSON.parse(
          savedState
        );


      if (
        parsed &&
        typeof parsed === "object"
      ) {

        state = {
          ...state,
          ...parsed
        };
      }
    }

  } catch (
    error
  ) {

    console.log(
      "MANUAL RSS STATE READ ERROR:",
      String(error)
    );
  }


  /*
     Якщо минули всі RSS —
     починаємо новий цикл.
  */

  if (
    state.feedIndex >=
    FEEDS.length
  ) {

    state = {
      feedIndex: 0,
      itemIndex: 0,
      totalSent: 0,
      totalSkipped: 0,
      totalErrors: 0
    };
  }


  let sentThisRun = 0;
  let skippedThisRun = 0;
  let errorsThisRun = 0;

  let processedThisRun = 0;


  await telegramJson(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        "📚 Продовжую перевірку RSS...\n\n" +
        `Джерело: ${state.feedIndex + 1}/${FEEDS.length}\n` +
        `За один запуск: максимум ${MANUAL_RSS_MAX_POSTS} постів`
    }
  );


  /*
     Йдемо по RSS,
     але зупиняємося після
     MANUAL_RSS_MAX_POSTS постів.
  */

  while (
    state.feedIndex <
      FEEDS.length &&
    processedThisRun <
      MANUAL_RSS_MAX_POSTS
  ) {

    const feedIndex =
      state.feedIndex;


    let response;


    try {

      response =
        await fetch(
          FEEDS[
            feedIndex
          ],
          {
            headers: {
              "User-Agent":
                "CharivnaRomaniaBot/1.0"
            }
          }
        );

    } catch (
      error
    ) {

      console.log(
        "ALL RSS FETCH ERROR:",
        feedIndex + 1,
        String(error)
      );


      errorsThisRun++;
      state.totalErrors++;


      /*
         Це RSS не відкрився —
         переходимо до наступного.
      */

      state.feedIndex++;
      state.itemIndex = 0;

      continue;
    }


    if (
      !response.ok
    ) {

      console.log(
        "ALL RSS HTTP ERROR:",
        feedIndex + 1,
        response.status
      );


      errorsThisRun++;
      state.totalErrors++;

      state.feedIndex++;
      state.itemIndex = 0;

      continue;
    }


    const xml =
      await response.text();


    const items =
      getAllItems(
        xml
      );


    console.log(
      "ALL RSS BATCH:",
      "feed=" + (feedIndex + 1),
      "items=" + items.length,
      "start=" + state.itemIndex
    );


    /*
       Якщо у цьому RSS вже все пройшли —
       наступний RSS.
    */

    if (
      state.itemIndex >=
      items.length
    ) {

      state.feedIndex++;
      state.itemIndex = 0;

      continue;
    }


    /*
       Обробляємо items цього RSS,
       починаючи з того місця,
       де зупинилися.
    */

    while (
      state.itemIndex <
        items.length &&
      processedThisRun <
        MANUAL_RSS_MAX_POSTS
    ) {

      const item =
        items[
          state.itemIndex
        ];


      /*
         ВАЖЛИВО:

         одразу пересуваємо cursor,
         щоб навіть якщо конкретний item
         впаде з помилкою —
         наступний запуск не зациклився
         на ньому назавжди.
      */

      state.itemIndex++;

      processedThisRun++;


      try {

        const result =
          await processFacebookItemForModeration(
            env,
            item,
            feedIndex + 1,
            true
          );


        console.log(
          "ALL RSS RESULT:",
          "feed=" +
            (feedIndex + 1),
          "item=" +
            state.itemIndex,
          JSON.stringify(
            result
          )
        );


        if (
          result?.ok &&
          result?.moderation
        ) {

          sentThisRun++;
          state.totalSent++;

        } else if (
          result?.skipped ||
          result?.duplicate
        ) {

          skippedThisRun++;
          state.totalSkipped++;

        } else {

          errorsThisRun++;
          state.totalErrors++;
        }

      } catch (
        error
      ) {

        console.log(
          "ALL RSS ITEM ERROR:",
          "feed=" +
            (feedIndex + 1),
          "item=" +
            state.itemIndex,
          String(error)
        );


        errorsThisRun++;
        state.totalErrors++;
      }


      /*
         Невелика пауза,
         щоб не лупити Telegram
         запитами одночасно.
      */

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            150
          )
      );
    }


    /*
       Якщо цей RSS закінчився —
       переходимо до наступного.
    */

    if (
      state.itemIndex >=
      items.length
    ) {

      state.feedIndex++;
      state.itemIndex = 0;
    }
  }


  /*
     Перевіряємо,
     чи закінчили всі RSS.
  */

  const finished =
    state.feedIndex >=
    FEEDS.length;


  if (
    finished
  ) {

    const totalSent =
      state.totalSent;

    const totalSkipped =
      state.totalSkipped;

    const totalErrors =
      state.totalErrors;


    /*
       Скидаємо cursor.
       Наступне натискання почне
       нову перевірку з RSS №1.
    */

    await env.CHARIVNA_ROMANIA.delete(
      MANUAL_RSS_STATE_KEY
    );


    await telegramJson(
      env,
      "sendMessage",
      {
        chat_id:
          chatId,

        text:
          "✅ Всі RSS перевірено.\n\n" +

          `📨 Надіслано на модерацію: ${totalSent}\n` +
          `⏭ Пропущено: ${totalSkipped}\n` +
          `⚠️ Помилок: ${totalErrors}\n\n` +

          "Наступне натискання «📚 Всі RSS» почне нову перевірку."
      }
    );


    return {
      ok: true,
      finished: true,
      sent:
        totalSent,
      skipped:
        totalSkipped,
      errors:
        totalErrors
    };
  }


  /*
     Ще залишилися RSS —
     зберігаємо позицію.
  */

  await env.CHARIVNA_ROMANIA.put(
    MANUAL_RSS_STATE_KEY,
    JSON.stringify(
      state
    ),
    {
      expirationTtl:
        86400
    }
  );


  await telegramJson(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        "✅ Ця порція готова.\n\n" +

        `📨 Надіслано зараз: ${sentThisRun}\n` +
        `⏭ Пропущено зараз: ${skippedThisRun}\n` +
        `⚠️ Помилок зараз: ${errorsThisRun}\n\n` +

        `📍 Дійшли до RSS ${state.feedIndex + 1}/${FEEDS.length}\n\n` +

        "Натисни «📚 Всі RSS» ще раз — продовжу звідси."
    }
  );


  return {
    ok: true,
    finished: false,

    feedIndex:
      state.feedIndex,

    itemIndex:
      state.itemIndex,

    sent:
      sentThisRun,

    skipped:
      skippedThisRun,

    errors:
      errorsThisRun
  };
}

async function testLatestRssLocations(
  env,
  chatId
) {

  let sent = 0;


  await telegramJson(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        `🧪 Перевіряю останній пост у кожному з ${FEEDS.length} RSS...`
    }
  );


  for (
    let i = 0;
    i < FEEDS.length;
    i++
  ) {

    let response;


    try {

      response =
        await fetch(
          FEEDS[i],
          {
            headers: {
              "User-Agent":
                "CharivnaRomaniaBot/1.0"
            }
          }
        );

    } catch {

      continue;
    }


    if (!response.ok) {
      continue;
    }


    const xml =
      await response.text();


    const items =
      getAllItems(
        xml
      );


    /*
       Тільки перший item RSS.
    */

    const item =
      items[0];


    if (!item) {
      continue;
    }


    const title =
      clean(
        getTag(
          item,
          "title"
        )
      );


    const description =
      clean(
        getTag(
          item,
          "description"
        )
      );


    const link =
      getTag(
        item,
        "link"
      );


    const facebookUrl =
      getFacebookUrl(
        item
      ) ||

      getFacebookUrl(
        description
      ) ||

      getFacebookUrl(
        link
      );


    const images =
      getImageUrls(
        item +
        " " +
        description
      );


    if (
      images.length === 0
    ) {

      continue;
    }

    let location =
      findLocation(
        item,
        i + 1
      );


    const originalLocation =
      location;


      const needsOnlineLocation =
        !location ||
        location === "Локацію не знайдено";


    if (
      needsOnlineLocation
    ) {

      const onlineLocation =
        await findLocationOnline(
          item,
          location
        );


      if (
        onlineLocation
      ) {

        location =
          onlineLocation;
      }
    }


    const shortDescription =
      description
        .slice(
          0,
          600
        );


    const caption =
      `🧪 RSS ${i + 1} — останній пост\n\n` +

      (
        location

          ? (
              `📍 ${location}\n` +

              (
                originalLocation &&
                originalLocation !== location

                  ? `↳ з посту: ${originalLocation}\n`

                  : ""
              ) +

              "\n"
            )

          : ""
      
        ) +

      (
        title
          ? `${title}\n\n`
          : ""
      ) +

      (
        shortDescription
          ? `${shortDescription}\n\n`
          : ""
      ) +

      (
        facebookUrl
          ? `Оригінал:\n${facebookUrl}`
          : ""
      );


    const photoUrl =
      "https://facebook-rss.onrender.com/image?url=" +
      encodeURIComponent(
        images[0]
      );


    const telegram =
      await telegramJson(
        env,
        "sendPhoto",
        {
          chat_id:
            chatId,

          photo:
            photoUrl,

          caption:
            caption.slice(
              0,
              1024
            )
        }
      );


    if (
      telegram.ok
    ) {

      sent++;
    }


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          200
        )
    );
  }


  await telegramJson(
    env,
    "sendMessage",
    {
      chat_id:
        chatId,

      text:
        `✅ Тест завершено. Надіслано останніх постів: ${sent}`
    }
  );


  return {
    ok:
      true,

    sent
  };
}


async function handlePrivateMessage(
  env,
  message
) {

  if (

    !message ||

    message.chat?.type !==
      "private"

  ) {

    return {

      ok:
        true,

      ignored:
        true

    };
  }


  const text =
    String(
      message.text || ""
    ).trim();


  /*
     ТІЛЬКИ ОСТАННІЙ ПОСТ
     ІЗ КОЖНОГО RSS
  */

  if (

    text ===
      "/test_latest_rss" ||

    text ===
      "🧪 Тест RSS"

  ) {

    return await testLatestRssLocations(
      env,
      message.chat.id
    );
  }


  /*
     ВСІ ПОСТИ RSS
  */

  if (
  text === "/test_ai"
) {

  try {

    const result =
      await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fast",
        {
          messages: [
            {
              role: "system",
              content:
                "Ти визначаєш головну географічну локацію поста про Румунію. " +
                "Відповідай ТІЛЬКИ назвою локації румунською мовою."
            },
            {
              role: "user",
              content:
                "Frumusețile României is in Transfăgărășan. " +
                "Transfagarasan, drumul care trece peste nori. " +
                "90 km de peisaje alpine, de la Curtea de Argeș până la Cârțișoara, " +
                "cu oprire la Barajul Vidraru."
            }
          ]
        }
      );


    console.log(
      "AI TEST RESULT:",
      JSON.stringify(result)
    );


    const answer =
      String(
        result?.response || ""
      ).trim();


    await telegramJson(
      env,
      "sendMessage",
      {
        chat_id:
          message.chat.id,

        text:
          "🤖 Workers AI:\n\n" +
          (
            answer ||
            JSON.stringify(result)
          )
      }
    );


    return {
      ok: true,
      aiTest: true
    };

  } catch (error) {

    console.error(
      "AI TEST ERROR:",
      error
    );


    await telegramJson(
      env,
      "sendMessage",
      {
        chat_id:
          message.chat.id,

        text:
          "❌ Workers AI error:\n" +
          String(
            error?.message ||
            error
          )
      }
    );


    return {
      ok: false,
      error:
        String(
          error?.message ||
          error
        )
    };
  }
}

  if (

    text ===
      "/test_rss" ||

    text ===
      "📚 Всі RSS"

  ) {

    return await testAllRssLocations(
      env,
      message.chat.id
    );
  }


  /*
     START
  */

  if (

    text ===
      "/start" ||

    text.startsWith(
      "/start "
    )

  ) {

    await telegramJson(
      env,
      "sendMessage",
      {

        chat_id:
          message.chat.id,

        text:

          "✅ Готово.\n\n" +

          "Тепер нові Facebook фото та відео з RSS будуть приходити сюди на модерацію.",

        reply_markup: {

          keyboard: [

            [
              {
                text:
                  "🧪 Тест RSS"
              },

              {
                text:
                  "📚 Всі RSS"
              }
            ]

          ],

          resize_keyboard:
            true,

          is_persistent:
            true

        }

      }
    );


    return {

      ok:
        true,

      registered:
        true

    };
  }


  return {

    ok:
      true

  };
}


/* =========================================================
   TELEGRAM UPDATE
========================================================= */

async function handleTelegramUpdate(
  env,
  update
) {

  if (
    update.callback_query
  ) {

    return await handleCallbackQuery(

      env,

      update.callback_query

    );
  }


  if (
    update.message
  ) {

    return await handlePrivateMessage(

      env,

      update.message

    );
  }


  return {

    ok:
      true,

    ignored:
      true

  };
}


/* =========================================================
   CLEANUP OLD FACEBOOK PENDING
========================================================= */

async function cleanupOldFacebookPending(
  env
) {

  const THREE_DAYS =

    3 *

    24 *

    60 *

    60 *

    1000;


  const now =
    Date.now();


  let cursor;


  do {

    const list =
      await env.CHARIVNA_ROMANIA.list({

        prefix:
          FACEBOOK_PENDING_PREFIX,

        cursor

      });


    for (
      const key
      of list.keys
    ) {

      const value =
        await env.CHARIVNA_ROMANIA.get(
          key.name
        );


      if (!value) {

        continue;
      }


      try {

        const item =
          JSON.parse(
            value
          );


        if (

          item.createdAt &&

          now -
          item.createdAt >=
          THREE_DAYS

        ) {

          await env.CHARIVNA_ROMANIA.delete(
            key.name
          );

        }

      } catch {

        continue;
      }
    }


    cursor =

      list.list_complete

        ? undefined

        : list.cursor;


  } while (
    cursor
  );
}

/* =========================================================
   DEBUG RSS
========================================================= */

async function debugRssFeeds() {

  const results = [];


  for (
    let i = 0;
    i < FEEDS.length;
    i++
  ) {

    const started =
      Date.now();

    const feedUrl =
      FEEDS[i];

    const result = {
      feed: i + 1,
      url: feedUrl
    };


    try {

      /*
         Максимум 40 секунд на один RSS.
         Щоб debug не зависав на кілька хвилин.
      */

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          40000
        );


      let response;

      try {

        response =
          await fetch(
            feedUrl,
            {
              headers: {
                "User-Agent":
                  "CharivnaRomaniaBot/1.0"
              },

              signal:
                controller.signal
            }
          );

      } finally {

        clearTimeout(
          timeout
        );
      }


      result.status =
        response.status;

      result.ok =
        response.ok;


      if (!response.ok) {

        result.time =
          (
            (
              Date.now() -
              started
            ) / 1000
          ).toFixed(1) + " sec";

        results.push(
          result
        );

        continue;
      }


      const xml =
        await response.text();


      const items =
        getAllItems(
          xml
        );


      result.items =
        items.length;


      /*
         Дивимося перший item,
         якщо він є.
      */

      if (
        items.length > 0
      ) {

        const first =
          items[0];


        const title =
          getTag(
            first,
            "title"
          );


        const description =
          getTag(
            first,
            "description"
          );


        const link =
          getTag(
            first,
            "link"
          );


        const facebookUrl =
          getFacebookUrl(
            first
          ) ||
          getFacebookUrl(
            description
          ) ||
          getFacebookUrl(
            link
          );


        const images =
          getImageUrls(
            first +
            " " +
            description
          );


        result.firstItem = {

          title:
            title.slice(
              0,
              200
            ),

          link,

          facebookUrl,

          images:
            images.length,

          firstImage:
            images[0] || null,

          location:
            findLocation(
              first
            ) || null

        };
      }


      result.time =
        (
          (
            Date.now() -
            started
          ) / 1000
        ).toFixed(1) + " sec";


    } catch (error) {

      result.ok =
        false;

      result.error =
        error?.name ===
        "AbortError"
          ? "TIMEOUT after 40 sec"
          : String(error);

      result.time =
        (
          (
            Date.now() -
            started
          ) / 1000
        ).toFixed(1) + " sec";
    }


    results.push(
      result
    );
  }


  return results;
}

/* =========================================================
   CRON
========================================================= */

async function runCron(
  env, scheduledTime = Date.now()
) {

    console.log("========== CRON START ==========");

  /*
     Спочатку публікуємо
     один запланований пост,
     якщо його час настав.
  */

  const published =
    await publishOneFacebookQueueItem(
      env
    );


  /*
     Потім шукаємо
     нові Facebook пости.
  */

  const found =
    await findNewFacebookItems(
      env,
      scheduledTime
    );

  console.log(
    "NEW FACEBOOK ITEMS:",
    found.length
  );

  for (const x of found) {
    console.log(
      "FOUND:",
      "feed=" + x.feed,
      x.facebookUrl
    );
  }


  const moderation =
    [];


  for (
    const foundItem
    of found
  ) {

    const result =
      await processFacebookItemForModeration(

        env,

        foundItem.item,

        foundItem.feed

      );

    console.log(
      "MODERATION RESULT:",
      "feed=" + foundItem.feed,
      JSON.stringify(result)
    );

    moderation.push(
      result
    );
  }


  return {

    ok:
      true,

    published,

    moderation

  };
}


/* =========================================================
   TELEGRAM WEBHOOK
========================================================= */

async function handleTelegramWebhookUpdate(
  update,
  env
) {

  let updateKey =
    "";


  const updateId =
    update?.update_id;


  if (
    updateId !== undefined
  ) {

    updateKey =
      "telegram-update:" +
      updateId;


    const alreadyProcessed =
      await env.CHARIVNA_ROMANIA.get(
        updateKey
      );


    if (
      alreadyProcessed
    ) {

      console.log(
        "DUPLICATE TELEGRAM UPDATE:",
        updateId
      );


      return {
        ok: true,
        duplicate: true
      };
    }
  }


  console.log(
    "TELEGRAM UPDATE:",
    updateId,
    update?.message?.text ||
    update?.callback_query?.data ||
    "unknown"
  );


  const result =
    await handleTelegramUpdate(
      env,
      update
    );


  if (
    updateKey
  ) {

    await env.CHARIVNA_ROMANIA.put(
      updateKey,
      "1",
      {
        expirationTtl:
          3600
      }
    );
  }


  console.log(
    "TELEGRAM RESULT:",
    JSON.stringify(
      result
    )
  );


  return {
    ok: true,
    result
  };
}

/* =========================================================
   WORKER
========================================================= */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(
        request.url
      );


    if (
      url.pathname ===
      "/reset-facebook"
    ) {

      const facebookUrl =
        url.searchParams.get(
          "url"
        );


      if (!facebookUrl) {

        return Response.json({
          ok: false,
          error:
            "url required"
        });
      }


      await unmarkPublished(
        env,
        facebookUrl
      );


      return Response.json({
        ok: true,
        reset:
          facebookUrl
      });
    }


    /*
       Telegram webhook.
    */
    if (
      request.method ===
        "POST"
    ) {

      let update;


      try {

        update =
          await request.json();

      } catch (
        error
      ) {

        console.error(
          "TELEGRAM JSON ERROR:",
          error?.stack ||
          String(error)
        );


        return new Response(
          "OK",
          {
            status: 200
          }
        );
      }


      ctx.waitUntil(

        handleTelegramWebhookUpdate(
          update,
          env
        )
          .catch(
            error => {

              console.error(
                "TELEGRAM WEBHOOK ERROR:",
                error?.stack ||
                String(error)
              );

            }
          )

      );


      return new Response(
        "OK",
        {
          status: 200
        }
      );
    }

    /*
       GET — перевірка,
       що Worker живий.
    */

    return Response.json({

      ok:
        true,

      message:
        "Charivna Romania Worker працює.",

      feeds:
        FEEDS.length,

      facebook:
        true,

      wikimedia:
        false,

      moderation:
        true

    });
  },


  async scheduled(
    event,
    env,
    ctx
  ) {

    /*
       Основний Cron.
    */

    ctx.waitUntil(
      runCron(
        env,
        event.scheduledTime
      )
    );


    /*
       Старі непідтверджені
       Facebook пости чистимо
       тільки один раз на добу
       близько 04:00.

       Не запускаємо важке
       очищення кожні 5 хвилин.
    */

    const romaniaTime =
  new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        "Europe/Bucharest",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false
    }
  ).formatToParts(
    new Date()
  );


const romaniaHour =
  Number(
    romaniaTime.find(
      part =>
        part.type === "hour"
    )?.value || 0
  );


    const romaniaMinute =
      Number(
        romaniaTime.find(
          part =>
            part.type === "minute"
        )?.value || 0
      );


    if (
      romaniaHour === 4 &&
      romaniaMinute < 5
    ) {

      ctx.waitUntil(
        cleanupOldFacebookPending(
          env
        )
      );
    }
  }

};
