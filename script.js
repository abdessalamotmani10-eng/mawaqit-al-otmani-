// ========== إخفاء شاشة البداية ==========
setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';
    document.getElementById('mainAppContent').style.display = 'flex';
    loadSettings();
    updateCountdown();
    startPrayerMonitoring();
    checkShutdownTime();
    highlightNextPrayer();
    startHadithSystem();
    startAdSystem();
    updateSettingsButtonVisibility();
}, 3000);

// ========== الساعة والتاريخ ==========
const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const gregorianMonths = ["يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const hijriMonths = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];

let showHijriDate = true;
let dateToggleTimer = null;
let hijriAdjust = 0;

function getHijriDate() {
    const now = new Date();
    const startDate = new Date(2026, 2, 20);
    const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
    let day = 1 + diffDays + hijriAdjust;
    let month = 10, year = 1447;
    while (day > 30) { day -= 30; month++; if (month > 12) { month = 1; year++; } }
    while (day < 1) { day += 30; month--; if (month < 1) { month = 12; year--; } }
    return { day, month, year };
}

function getFormattedGregorianDate() {
    const now = new Date();
    const weekday = weekDays[now.getDay()];
    return `${weekday} ${now.getDate()} ${gregorianMonths[now.getMonth()]} ${now.getFullYear()} م`;
}

function getFormattedHijriDate() {
    const h = getHijriDate();
    const weekday = weekDays[new Date().getDay()];
    return `${weekday} ${h.day.toString().padStart(2, '0')} ${hijriMonths[h.month - 1]} ${h.year} هـ`;
}

function updateDateDisplay() {
    const dateEl = document.getElementById('dateText');
    if (dateEl) {
        if (showHijriDate) {
            dateEl.textContent = getFormattedHijriDate();
        } else {
            dateEl.textContent = getFormattedGregorianDate();
        }
    }
}

function startDateToggle() {
    if (dateToggleTimer) clearInterval(dateToggleTimer);
    updateDateDisplay();
    dateToggleTimer = setInterval(() => {
        showHijriDate = !showHijriDate;
        updateDateDisplay();
    }, 5000);
}

// ========== إعدادات الصلاة ==========
let prayerTimes = { fajr: "05:00", dhuhr: "12:30", asr: "15:30", maghrib: "18:45", isha: "20:00" };
let prayerAdjust = { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 };
let prayerDurations = { fajr: 15, dhuhr: 15, asr: 15, maghrib: 15, isha: 15 };
let iqamaTimes = { fajr: 10, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
let fridaySettings = { time: "12:30", duration: 30 };
let shutdownSettings = { enabled: false, shutdownTime: "22:00", wakeupTime: "04:00" };
let adSettings = {
    type: "flash",
    text: "",
    image: null,
    tickerEnabled: false,
    tickerText: "",
    tickerDirection: "ltr",
    flashEnabled: false,
    disableAll: false
};
let hadithSettings = { enabled: true, interval: 5 };
let prayerMethod = "auto";

// ========== تعطيل الإعلان الدائم نهائياً ==========
let permanentAdDisabled = false;

// ========== التحكم في ظهور زر الإعدادات (يظهر فقط في الشاشة الرئيسية) ==========
function updateSettingsButtonVisibility() {
    const settingsBtn = document.getElementById('onlySettingsBtn');
    if (!settingsBtn) return;

    // الشاشات التي يجب إخفاء الزر فيها (أذكار، حديث، أذان، إقامة، إعلانات، شاشة البداية)
    const hiddenScreens = [
        'azanScreen', 'duaScreen', 'iqamaCountdownScreen', 'iqamaScreen', 'prayerScreen',
        'adhkarScreen', 'hadithScreen', 'morningAdhkarScreen', 'eveningAdhkarScreen',
        'fridayScreen', 'shutdownScreen', 'flashAdScreen', 'permanentAdScreen',
        'splashScreen'
    ];
    
    let shouldHide = false;
    for (let screenId of hiddenScreens) {
        const screen = document.getElementById(screenId);
        if (screen && screen.style.display === 'flex') {
            shouldHide = true;
            break;
        }
    }
    
    if (shouldHide) {
        settingsBtn.style.display = 'none';
    } else {
        settingsBtn.style.display = 'flex';
    }
}

// ========== قائمة الدول مع طرق حساب مخصصة لكل بلد ==========
const countriesList = [
    { code: "dz", name: "الجزائر", defaultCity: "Algiers", methodCode: "8_dz", fajrAngle: 18, ishaAngle: 17 },
    { code: "ma", name: "المغرب", defaultCity: "Casablanca", methodCode: "7_ma", fajrAngle: 18, ishaAngle: 17 },
    { code: "sa", name: "السعودية", defaultCity: "Mecca", methodCode: "4", fajrAngle: 18.5, ishaAngle: 90 },
    { code: "eg", name: "مصر", defaultCity: "Cairo", methodCode: "5", fajrAngle: 19.5, ishaAngle: 17.5 },
    { code: "tn", name: "تونس", defaultCity: "Tunis", methodCode: "14", fajrAngle: 18, ishaAngle: 18 },
    { code: "ly", name: "ليبيا", defaultCity: "Tripoli", methodCode: "5", fajrAngle: 19.5, ishaAngle: 17.5 },
    { code: "jo", name: "الأردن", defaultCity: "Amman", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "ps", name: "فلسطين", defaultCity: "Jerusalem", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "lb", name: "لبنان", defaultCity: "Beirut", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "sy", name: "سوريا", defaultCity: "Damascus", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "iq", name: "العراق", defaultCity: "Baghdad", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "kw", name: "الكويت", defaultCity: "Kuwait City", methodCode: "9", fajrAngle: 18, ishaAngle: 17 },
    { code: "ae", name: "الإمارات", defaultCity: "Dubai", methodCode: "12", fajrAngle: 18, ishaAngle: 17 },
    { code: "qa", name: "قطر", defaultCity: "Doha", methodCode: "10", fajrAngle: 18, ishaAngle: 17 },
    { code: "tr", name: "تركيا", defaultCity: "Istanbul", methodCode: "13", fajrAngle: 18, ishaAngle: 17 },
    { code: "bh", name: "البحرين", defaultCity: "Manama", methodCode: "11", fajrAngle: 18, ishaAngle: 17 },
    { code: "om", name: "عمان", defaultCity: "Muscat", methodCode: "15", fajrAngle: 18, ishaAngle: 17 },
    { code: "ye", name: "اليمن", defaultCity: "Sana'a", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "pk", name: "باكستان", defaultCity: "Islamabad", methodCode: "16", fajrAngle: 18, ishaAngle: 17 },
    { code: "id", name: "إندونيسيا", defaultCity: "Jakarta", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "my", name: "ماليزيا", defaultCity: "Kuala Lumpur", methodCode: "20", fajrAngle: 18, ishaAngle: 17 },
    { code: "in", name: "الهند", defaultCity: "Delhi", methodCode: "17", fajrAngle: 18, ishaAngle: 17 },
    { code: "fr", name: "فرنسا", defaultCity: "Paris", methodCode: "21", fajrAngle: 18, ishaAngle: 17 },
    { code: "de", name: "ألمانيا", defaultCity: "Berlin", methodCode: "22", fajrAngle: 18, ishaAngle: 17 },
    { code: "uk", name: "بريطانيا", defaultCity: "London", methodCode: "2", fajrAngle: 18, ishaAngle: 17 },
    { code: "us", name: "الولايات المتحدة", defaultCity: "New York", methodCode: "3", fajrAngle: 18, ishaAngle: 17 },
    { code: "ru", name: "روسيا", defaultCity: "Moscow", methodCode: "18", fajrAngle: 18, ishaAngle: 17 },
    { code: "sg", name: "سنغافورة", defaultCity: "Singapore", methodCode: "19", fajrAngle: 18, ishaAngle: 17 }
];

// ========== ولايات الجزائر ==========
const algeriaWilayas = {
    "الجزائر": "Algiers", "وهران": "Oran", "قسنطينة": "Constantine", "عنابة": "Annaba", "تلمسان": "Tlemcen",
    "سطيف": "Setif", "بجاية": "Bejaia", "بسكرة": "Biskra", "باتنة": "Batna", "تيزي وزو": "Tizi Ouzou",
    "البويرة": "Bouira", "جيجل": "Jijel", "ورقلة": "Ouargla", "تمنراست": "Tamanrasset", "أدرار": "Adrar",
    "غرداية": "Ghardaia", "بشار": "Bechar", "الأغواط": "Laghouat", "تبسة": "Tebessa", "تيارت": "Tiaret",
    "المدية": "Medea", "مستغانم": "Mostaganem", "المسيلة": "Msila", "معسكر": "Mascara", "سكيكدة": "Skikda",
    "سيدي بلعباس": "Sidi Bel Abbes", "قالمة": "Guelma", "الجلفة": "Djelfa", "برج بوعريريج": "Bordj Bou Arreridj",
    "بومرداس": "Boumerdes", "الطارف": "El Tarf", "تندوف": "Tindouf", "تيسمسيلت": "Tissemsilt", "الوادي": "El Oued",
    "خنشلة": "Khenchela", "سوق أهراس": "Souk Ahras", "تيبازة": "Tipaza", "ميلة": "Mila", "عين الدفلى": "Ain Defla",
    "النعامة": "Naama", "عين تموشنت": "Ain Temouchent", "غليزان": "Relizane", "المغير": "El Mghair", "المنيعة": "El Menia",
    "أولاد جلال": "Ouled Djellal", "بني عباس": "Beni Abbes", "تيميمون": "Timimoun", "تقرت": "Touggourt", "جانت": "Djanet",
    "عين صالح": "Ain Salah", "عين قزام": "Ain Guezzam", "برج باجي مختار": "Bordj Badji Mokhtar"
};

const algeriaCoordinates = {
    "الجزائر": { lat: 36.7538, lng: 3.0588 }, "وهران": { lat: 35.6969, lng: -0.6331 }, "قسنطينة": { lat: 36.3650, lng: 6.6147 },
    "عنابة": { lat: 36.9000, lng: 7.7667 }, "تلمسان": { lat: 34.8833, lng: -1.3167 }, "سطيف": { lat: 36.1911, lng: 5.4097 },
    "بجاية": { lat: 36.7500, lng: 5.0833 }, "بسكرة": { lat: 34.8500, lng: 5.7333 }, "باتنة": { lat: 35.5550, lng: 6.1742 },
    "تيزي وزو": { lat: 36.7167, lng: 4.0500 }, "البويرة": { lat: 36.3783, lng: 3.9000 }, "جيجل": { lat: 36.8200, lng: 5.7700 },
    "ورقلة": { lat: 31.9500, lng: 5.3167 }, "تمنراست": { lat: 22.7850, lng: 5.5228 }, "أدرار": { lat: 27.8962, lng: -0.2892 },
    "غرداية": { lat: 32.4833, lng: 3.6667 }, "بشار": { lat: 31.6167, lng: -2.2167 }, "الأغواط": { lat: 33.7999, lng: 2.8650 },
    "تبسة": { lat: 35.4000, lng: 8.1167 }, "تيارت": { lat: 35.3667, lng: 1.3167 }, "المدية": { lat: 36.2667, lng: 2.7500 },
    "مستغانم": { lat: 35.9333, lng: 0.0833 }, "المسيلة": { lat: 35.7000, lng: 4.5333 }, "معسكر": { lat: 35.4000, lng: 0.1333 },
    "سكيكدة": { lat: 36.8667, lng: 6.9000 }, "سيدي بلعباس": { lat: 35.2000, lng: -0.6333 }, "قالمة": { lat: 36.4667, lng: 7.4333 },
    "الجلفة": { lat: 34.6667, lng: 3.2500 }, "برج بوعريريج": { lat: 36.0667, lng: 4.7667 }, "بومرداس": { lat: 36.7667, lng: 3.4667 },
    "الطارف": { lat: 36.7667, lng: 8.3167 }, "تندوف": { lat: 27.6833, lng: -8.1333 }, "تيسمسيلت": { lat: 35.6000, lng: 1.8167 },
    "الوادي": { lat: 33.4667, lng: 7.0000 }, "خنشلة": { lat: 35.4167, lng: 7.1333 }, "سوق أهراس": { lat: 36.2833, lng: 7.9500 },
    "تيبازة": { lat: 36.5833, lng: 2.4333 }, "ميلة": { lat: 36.4500, lng: 6.2667 }, "عين الدفلى": { lat: 36.2667, lng: 2.2000 },
    "النعامة": { lat: 33.2667, lng: -0.3167 }, "عين تموشنت": { lat: 35.3000, lng: -1.1333 }, "غليزان": { lat: 35.7333, lng: 0.5500 },
    "المغير": { lat: 33.9500, lng: 5.9167 }, "المنيعة": { lat: 30.5833, lng: 2.8833 }, "أولاد جلال": { lat: 34.4167, lng: 5.0667 },
    "بني عباس": { lat: 30.1167, lng: -2.1667 }, "تيميمون": { lat: 29.2500, lng: 0.2333 }, "تقرت": { lat: 33.1000, lng: 6.0667 },
    "جانت": { lat: 24.5500, lng: 9.4833 }, "عين صالح": { lat: 27.2000, lng: 2.4833 }, "عين قزام": { lat: 19.5667, lng: 5.7667 },
    "برج باجي مختار": { lat: 21.3667, lng: 0.9500 }
};

const worldCities = {
    "Algiers": { lat: 36.7538, lng: 3.0588 }, "Mecca": { lat: 21.4225, lng: 39.8262 }, "Cairo": { lat: 30.0444, lng: 31.2357 },
    "Casablanca": { lat: 33.5731, lng: -7.5898 }, "Tunis": { lat: 36.8065, lng: 10.1815 }, "Tripoli": { lat: 32.8872, lng: 13.1913 },
    "Amman": { lat: 31.9454, lng: 35.9284 }, "Jerusalem": { lat: 31.7683, lng: 35.2137 }, "Beirut": { lat: 33.8938, lng: 35.5018 },
    "Damascus": { lat: 33.5138, lng: 36.2765 }, "Baghdad": { lat: 33.3152, lng: 44.3661 }, "Kuwait City": { lat: 29.3759, lng: 47.9774 },
    "Dubai": { lat: 25.2048, lng: 55.2708 }, "Doha": { lat: 25.2854, lng: 51.5310 }, "Manama": { lat: 26.2285, lng: 50.5860 },
    "Muscat": { lat: 23.5880, lng: 58.3829 }, "Sana'a": { lat: 15.3694, lng: 44.1910 }, "Istanbul": { lat: 41.0082, lng: 28.9784 },
    "Jakarta": { lat: -6.2088, lng: 106.8456 }, "Kuala Lumpur": { lat: 3.1390, lng: 101.6869 }, "Islamabad": { lat: 33.6844, lng: 73.0479 },
    "Paris": { lat: 48.8566, lng: 2.3522 }, "Berlin": { lat: 52.5200, lng: 13.4050 }, "London": { lat: 51.5074, lng: -0.1278 },
    "New York": { lat: 40.7128, lng: -74.0060 }, "Delhi": { lat: 28.6139, lng: 77.2090 }, "Moscow": { lat: 55.7558, lng: 37.6173 },
    "Singapore": { lat: 1.3521, lng: 103.8198 }
};

let currentCountry = null;
let currentCity = null;
let currentLat = 36.7538, currentLng = 3.0588;
let currentMethodCode = "8_dz";
let customFajrAngle = 18, customIshaAngle = 18;

// ========== دوال مساعدة ==========
function timeToMinutes(t) { let [h, m] = t.split(':').map(Number); return h * 60 + m; }
function minutesToTime(min) { let h = Math.floor(min / 60); let m = min % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; }
function applyAdjustment(time, adjust) { let total = timeToMinutes(time) + adjust; if (total < 0) total += 1440; if (total >= 1440) total -= 1440; return minutesToTime(total); }

function getMethodAndAngles(methodCode) {
    const specials = {
        "8_dz": { method: 8, fajrAngle: 18, ishaAngle: 17 },
        "7_ma": { method: 7, fajrAngle: 18, ishaAngle: 17 },
        "9": { method: 9, fajrAngle: null, ishaAngle: null },
        "10": { method: 10, fajrAngle: null, ishaAngle: null },
        "11": { method: 11, fajrAngle: null, ishaAngle: null },
        "12": { method: 12, fajrAngle: null, ishaAngle: null },
        "13": { method: 13, fajrAngle: null, ishaAngle: null },
        "14": { method: 14, fajrAngle: null, ishaAngle: null },
        "15": { method: 15, fajrAngle: null, ishaAngle: null },
        "16": { method: 16, fajrAngle: null, ishaAngle: null },
        "17": { method: 17, fajrAngle: null, ishaAngle: null },
        "18": { method: 18, fajrAngle: null, ishaAngle: null },
        "19": { method: 19, fajrAngle: null, ishaAngle: null },
        "20": { method: 20, fajrAngle: null, ishaAngle: null },
        "21": { method: 21, fajrAngle: null, ishaAngle: null },
        "22": { method: 22, fajrAngle: null, ishaAngle: null },
        "99": { method: 99, fajrAngle: customFajrAngle, ishaAngle: customIshaAngle }
    };
    if (specials[methodCode]) return specials[methodCode];
    const num = parseInt(methodCode);
    if (!isNaN(num)) return { method: num, fajrAngle: null, ishaAngle: null };
    return { method: 2, fajrAngle: null, ishaAngle: null };
}

async function fetchPrayerTimes(lat, lng, methodCode) {
    const { method, fajrAngle, ishaAngle } = getMethodAndAngles(methodCode);
    let url;
    if (method == 99) {
        url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=99&fajrAngle=${fajrAngle}&ishaAngle=${ishaAngle}&school=0&midnightMode=1`;
    } else {
        url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}&school=0&midnightMode=1`;
    }
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code !== 200) throw new Error("API error");
        const t = data.data.timings;
        return {
            fajr: t.Fajr.substring(0, 5),
            dhuhr: t.Dhuhr.substring(0, 5),
            asr: t.Asr.substring(0, 5),
            maghrib: t.Maghrib.substring(0, 5),
            isha: t.Isha.substring(0, 5),
            sunrise: t.Sunrise.substring(0, 5)
        };
    } catch (e) { console.error(e); return null; }
}

async function updatePrayerTimes() {
    if (prayerMethod === "manual") {
        updatePrayerDisplay();
        highlightNextPrayer();
        updateCountdown();
        return;
    }
    let times = await fetchPrayerTimes(currentLat, currentLng, currentMethodCode);
    if (!times) return;
    prayerTimes = {
        fajr: applyAdjustment(times.fajr, prayerAdjust.fajr),
        dhuhr: applyAdjustment(times.dhuhr, prayerAdjust.dhuhr),
        asr: applyAdjustment(times.asr, prayerAdjust.asr),
        maghrib: applyAdjustment(times.maghrib, prayerAdjust.maghrib),
        isha: applyAdjustment(times.isha, prayerAdjust.isha)
    };
    const sunriseEl = document.getElementById('sunriseVal');
    if (sunriseEl) sunriseEl.textContent = applyAdjustment(times.sunrise, 0);
    updatePrayerDisplay();
    highlightNextPrayer();
    updateCountdown();
}

function updatePrayerDisplay() {
    const fajrEl = document.getElementById('fajrTime');
    const dhuhrEl = document.getElementById('dhuhrTime');
    const asrEl = document.getElementById('asrTime');
    const maghribEl = document.getElementById('maghribTime');
    const ishaEl = document.getElementById('ishaTime');
    const fridayEl = document.getElementById('fridayVal');
    if (fajrEl) fajrEl.textContent = prayerTimes.fajr;
    if (dhuhrEl) dhuhrEl.textContent = prayerTimes.dhuhr;
    if (asrEl) asrEl.textContent = prayerTimes.asr;
    if (maghribEl) maghribEl.textContent = prayerTimes.maghrib;
    if (ishaEl) ishaEl.textContent = prayerTimes.isha;
    if (fridayEl) fridayEl.textContent = fridaySettings.time;
}

// ========== درجة الحرارة ==========
async function fetchWeather(cityName) {
    try {
        const response = await fetch(`https://wttr.in/${cityName}?format=%t&lang=ar`, { mode: 'cors' });
        if (!response.ok) throw new Error("HTTP error");
        let temp = await response.text();
        temp = temp.replace(/[+°]/g, '').trim();
        temp = temp.replace(/C/g, '').trim();
        if (temp && temp !== '') return temp;
        else return null;
    } catch (e) { return null; }
}

async function updateWeather() {
    const tempElement = document.getElementById('tempDegree');
    if (!tempElement) return;
    if (!navigator.onLine) { tempElement.textContent = '-- °C'; return; }
    let cityName = '';
    if (currentCountry && currentCountry.code === 'dz') {
        cityName = algeriaWilayas[currentCity] || 'Algiers';
    } else {
        cityName = currentCity || 'Algiers';
    }
    const temp = await fetchWeather(cityName);
    if (temp) {
        tempElement.textContent = `${temp} °C`;
    } else { tempElement.textContent = '-- °C'; }
}

// ========== تحديث الساعة والعد التنازلي ==========
function updateClock() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = timeStr;
}

function updateCountdown() {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const prayers = [
        { name: "الفجر", min: timeToMinutes(prayerTimes.fajr), id: "prayerFajrCard" },
        { name: "الظهر", min: timeToMinutes(prayerTimes.dhuhr), id: "prayerDhuhrCard" },
        { name: "العصر", min: timeToMinutes(prayerTimes.asr), id: "prayerAsrCard" },
        { name: "المغرب", min: timeToMinutes(prayerTimes.maghrib), id: "prayerMaghribCard" },
        { name: "العشاء", min: timeToMinutes(prayerTimes.isha), id: "prayerIshaCard" }
    ].sort((a, b) => a.min - b.min);
    let next = prayers.find(p => p.min > cur);
    if (!next) { next = prayers[0]; next.min += 1440; }
    let diff = next.min - cur;
    let h = Math.floor(diff / 60), m = diff % 60;
    const countdownEl = document.getElementById('countdownText');
    if (countdownEl) countdownEl.textContent = `متبقي لصلاة ${next.name}: ${h} ساعة ${m} دقيقة`;
    highlightNextPrayer(next.id);
}

function highlightNextPrayer(nextId) {
    const all = ['prayerFajrCard', 'prayerDhuhrCard', 'prayerAsrCard', 'prayerMaghribCard', 'prayerIshaCard'];
    all.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('next-prayer', 'blinking-prayer');
    });
    if (nextId) document.getElementById(nextId)?.classList.add('next-prayer');
}

function blinkCurrentPrayer(prayerId) {
    const el = document.getElementById(prayerId);
    if (el) {
        el.classList.add('blinking-prayer');
        setTimeout(() => el.classList.remove('blinking-prayer'), 3000);
    }
}

// ========== نظام الأذان والإقامة والأذكار ==========
let currentPrayerState = null;
let prayerTimers = [];
let azanActive = false;
let flashAdInterval = null;
let hadithTimer = null;
let currentIqamaTimeout = null;

// أذكار بعد الصلاة المكتوبة
const adhkarPages = [
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="dhikr-row"><span class="dhikr-item">أستغفر الله</span><span class="dhikr-item">أستغفر الله</span><span class="dhikr-item">أستغفر الله</span></div><div class="dhikr-item">اللهم أنت السلام ومنك السلام تباركت يا ذا الجلال والإكرام</div><div class="dhikr-item">اللهم أعني على ذكرك وشكرك وحسن عبادتك</div></div>` },
    { duration: 45000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="dhikr-row"><span class="dhikr-item">سبحان الله <span class="dhikr-highlight">33</span></span><span class="dhikr-item">الحمد لله <span class="dhikr-highlight">33</span></span><span class="dhikr-item">الله أكبر <span class="dhikr-highlight">33</span></span></div><div class="dhikr-item">لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="dhikr-item">لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير</div><div class="dhikr-item">اللهم لا مانع لما أعطيت ولا معطي لما منعت ولا ينفع ذا الجد منك الجد</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="dhikr-item">لا حول ولا قوة إلا بالله</div><div class="dhikr-item">لا إله إلا الله ولا نعبد إلا إياه، له النعمة وله الفضل وله الثناء الحسن</div><div class="dhikr-item">لا إله إلا الله مخلصين له الدين ولو كره الكافرون</div></div>` },
    { duration: 35000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="ayatul-kursi"><div>اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="surat-ikhlas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ</div><div class="line2">لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="surat-falaq"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ</div><div class="line2">وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ</div><div class="line3">وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">الأذكار بعد الصلاة المكتوبة</h3><div class="surat-nas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ</div><div class="line2">إِلَٰهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ</div><div class="line3">الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` }
];

function hideAllScreens() {
    const ids = ['azanScreen', 'duaScreen', 'iqamaCountdownScreen', 'iqamaScreen', 'prayerScreen', 'adhkarScreen', 'hadithScreen', 'morningAdhkarScreen', 'eveningAdhkarScreen', 'flashAdScreen', 'permanentAdScreen', 'fridayScreen'];
    ids.forEach(id => { let el = document.getElementById(id); if (el) el.style.display = 'none'; });
    updateSettingsButtonVisibility();
}

function clearTimers() { prayerTimers.forEach(t => clearTimeout(t)); prayerTimers = []; if (currentIqamaTimeout) clearInterval(currentIqamaTimeout); }

function showAzanScreen(name) {
    hideAllScreens(); clearTimers(); azanActive = true; updateTicker();
    const azanPrayerEl = document.getElementById('azanPrayerName');
    if (azanPrayerEl) azanPrayerEl.textContent = `حان الآن موعد آذان صلاة ${name}`;
    const azanScreen = document.getElementById('azanScreen');
    if (azanScreen) azanScreen.style.display = 'flex';
    setTimeout(() => {
        const azanScreen2 = document.getElementById('azanScreen');
        if (azanScreen2) azanScreen2.style.display = 'none';
        showDuaScreen();
    }, 90000);
}

function showDuaScreen() {
    const duaScreen = document.getElementById('duaScreen');
    if (duaScreen) duaScreen.style.display = 'flex';
    setTimeout(() => {
        const duaScreen2 = document.getElementById('duaScreen');
        if (duaScreen2) duaScreen2.style.display = 'none';
        startIqamaCountdown();
    }, 30000);
}

function startIqamaCountdown() {
    let iqamaMin = iqamaTimes[currentPrayerState] || 10;
    let totalSeconds = (iqamaMin * 60) - 120;
    if (totalSeconds < 0) totalSeconds = 0;
    const screen = document.getElementById('iqamaCountdownScreen');
    const num = document.getElementById('countdownNumber');
    const label = document.getElementById('countdownLabel');
    if (screen) screen.style.display = 'flex';
    let remaining = totalSeconds;
    function updateDisplay() {
        if (num && label) {
            if (remaining > 60) {
                let min = Math.floor(remaining / 60);
                let secs = remaining % 60;
                num.textContent = `${min}:${secs.toString().padStart(2, '0')}`;
                label.textContent = 'دقائق متبقية للإقامة';
            } else {
                num.textContent = remaining;
                label.textContent = 'ثانية متبقية للإقامة';
            }
        }
    }
    updateDisplay();
    currentIqamaTimeout = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            updateDisplay();
        } else {
            clearInterval(currentIqamaTimeout);
            showIqamaScreen();
        }
    }, 1000);
}

function showIqamaScreen() {
    hideAllScreens();
    const iqamaScreen = document.getElementById('iqamaScreen');
    if (iqamaScreen) iqamaScreen.style.display = 'flex';
    setTimeout(() => {
        const iqamaScreen2 = document.getElementById('iqamaScreen');
        if (iqamaScreen2) iqamaScreen2.style.display = 'none';
        startPrayerScreen();
    }, 30000);
}

function startPrayerScreen() {
    hideAllScreens();
    const prayerScreen = document.getElementById('prayerScreen');
    if (prayerScreen) prayerScreen.style.display = 'flex';
    let dur = prayerDurations[currentPrayerState] || 15;
    setTimeout(() => {
        const prayerScreen2 = document.getElementById('prayerScreen');
        if (prayerScreen2) prayerScreen2.style.display = 'none';
        showAdhkarScreen();
    }, dur * 60000);
}

function showAdhkarScreen() {
    hideAllScreens();
    const content = document.getElementById('adhkarContent');
    const pagination = document.getElementById('adhkarPage');
    let page = 0;
    function showPage(i) {
        if (i < adhkarPages.length) {
            if (content) content.innerHTML = adhkarPages[i].content;
            if (pagination) pagination.textContent = `${i + 1} / ${adhkarPages.length}`;
            setTimeout(() => showPage(i + 1), adhkarPages[i].duration);
        } else {
            finishPrayerSequence();
        }
    }
    showPage(0);
    const adhkarScreen = document.getElementById('adhkarScreen');
    if (adhkarScreen) adhkarScreen.style.display = 'flex';
}

function finishPrayerSequence() {
    hideAllScreens();
    let prayerType = currentPrayerState;
    azanActive = false;
    currentPrayerState = null;
    clearTimers();
    updateTicker();
    if (prayerType === 'fajr') {
        setTimeout(() => { if (!azanActive) showMorningAdhkar(); }, 60000);
    } else if (prayerType === 'asr') {
        setTimeout(() => { if (!azanActive) showEveningAdhkar(); }, 60000);
    }
}

// ========== أذكار الصباح (كما في الكود السابق) ==========
const morningAdhkarList = [
    { duration: 35000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="ayatul-kursi" style="font-size:1.1rem; line-height:2;">{الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤده حفظهما وهو العلي العظيم} (البقرة:255)<br><br>رواه الحاكم وابن حبان.</div></div>` },
    { duration: 18000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أصبحنا على فطرة الإسلام وكلِمة الإخلاص، ودين نبينا محمد صلى الله عليه وسلم، ومِلَّةِ أبينا إبراهيم، حنيفاً مسلماً، وما كان من المشركين.<br><br>رواه أحمد.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">رضيت بالله ربا، وبالإسلام دينا، وبمحمد صلى الله عليه وسلم نبياً.<br><br>رواه أصحاب السنن.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم إني أسألك علماً نافعاً، ورزقاً طيباً، وعملاً متقبلاً.<br><br>رواه ابن ماجه.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.<br><br>رواه أصحاب السنن عدا النسائي.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، وهو على كل شيء قدير.<br><br>رواه البزار والطبراني في "الدعاء".</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">يا حيُّ يا قيوم برحمتك أستغيثُ، أصلح لي شأني كله، ولا تَكلني إلى نفسي طَرْفَةَ عين أبدًا.<br><br>رواه البزار.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم أنت ربي، لا إله إلا أنت، خلقتني وأنا عبدُك, وأنا على عهدِك ووعدِك ما استطعتُ، أعوذ بك من شر ما صنعتُ، أبوءُ لَكَ بنعمتكَ عَلَيَّ، وأبوء بذنبي، فاغفر لي، فإنه لا يغفرُ الذنوب إلا أنت.<br><br>رواه البخاري.</div></div>` },
    { duration: 18000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم فاطر السموات والأرض، عالم الغيب والشهادة، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت, أعوذ بك من شرّ نفسي، ومن شرّ الشيطان وشركه، وأن أقترف على نفسي سوءا، أو أجره إلى مسلم.<br><br>رواه الترمذي.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أصبحنا وأصبح الملك لله، والحمد لله ولا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير، أسألك خير ما في هذا اليوم، وخير ما بعده، وأعوذ بك من شر هذا اليوم، وشر ما بعده، وأعوذ بك من الكسل وسوء الكبر، وأعوذ بك من عذاب النار وعذاب القبر.<br><br>رواه مسلم.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي، وآمن روعاتي، واحفظني من بين يدي، ومن خلفي، وعن يميني، وعن شمالي، ومن فوقي، وأعوذ بك أن أغتال من تحتي.<br><br>رواه أبو داود وابن ماجه.</div></div>` },
    { duration: 10000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم. (ثلاث مرات)<br><br>رواه أصحاب السنن عدا النسائي.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">سبحان الله عدد خلقه، سبحان الله رضا نفسه، سبحان الله زنة عرشه، سبحان الله مداد كلماته. (ثلاث مرات)<br><br>رواه مسلم.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت، اللهم إني أعوذ بك من الكفر والفقر، اللهم إني أعوذ بك من عذاب القبر، لا إله إلا أنت. (ثلاث مرات)<br><br>رواه أبو داود.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="surat-ikhlas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ</div><div class="line2">لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="surat-falaq"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ</div><div class="line2">وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ</div><div class="line3">وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="surat-nas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ</div><div class="line2">إِلَٰهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ</div><div class="line3">الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">{حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم} (التوبة:129). (سبع مرات)<br><br>رواه أبو داود.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم إني أصبحت، أُشهدك وأُشهد حملة عرشك وملائكتك وجميع خلقك أنك أنت الله، وحدك لا شريك لك وأن محمداً عبدك ورسولك. (أربع مرات)<br><br>أبو داود والترمذي.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، يحيي ويميت، وهو على كل شيء قدير. (عشر مرات)<br><br>رواه ابن حبان.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">سبحان الله وبحمده. أو: سبحان الله العظيم وبحمده. (مائة مرة أو أكثر)<br><br>رواه مسلم.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أستغفر الله. (مائة مرة)<br><br>رواه ابن أبي شيبة.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار الصباح</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">سبحان الله، والحمد لله، والله أكبر, لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، وهو على كل شيء قدير. (مائة مرّةٍ أو أكثر)<br><br>رواه الترمذي.</div></div>` }
];

// ========== أذكار المساء ==========
const eveningAdhkarList = [
    { duration: 35000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="ayatul-kursi" style="font-size:1.1rem; line-height:2;">{الله لا إله إلا هو الحي القيوم لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض من ذا الذي يشفع عنده إلا بإذنه يعلم ما بين أيديهم وما خلفهم ولا يحيطون بشيء من علمه إلا بما شاء وسع كرسيه السماوات والأرض ولا يؤده حفظهما وهو العلي العظيم} (البقرة:255)<br><br>رواه الحاكم وابن حبان.</div></div>` },
    { duration: 18000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أمسينا على فطرة الإسلام وكلِمة الإخلاص، ودين نبينا محمد صلى الله عليه وسلم، ومِلَّةِ أبينا إبراهيم، حنيفاً مسلماً، وما كان من المشركين.<br><br>رواه أحمد.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">رضيت بالله ربا، وبالإسلام دينا، وبمحمد صلى الله عليه وسلم نبياً.<br><br>رواه أصحاب السنن.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.<br><br>رواه أصحاب السنن عدا النسائي.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، وهو على كل شيء قدير.<br><br>رواه البزار والطبراني في "الدعاء".</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">يا حيُّ يا قيوم برحمتك أستغيثُ، أصلح لي شأني كله، ولا تَكلني إلى نفسي طَرْفَةَ عين أبدًا.<br><br>رواه البزار.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم أنت ربي، لا إله إلا أنت، خلقتني وأنا عبدُك, وأنا على عهدِك ووعدِك ما استطعتُ، أعوذ بك من شر ما صنعتُ، أبوءُ لَكَ بنعمتكَ عَلَيَّ، وأبوء بذنبي، فاغفر لي، فإنه لا يغفرُ الذنوب إلا أنت.<br><br>رواه البخاري.</div></div>` },
    { duration: 18000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم فاطر السموات والأرض، عالم الغيب والشهادة، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت, أعوذ بك من شرّ نفسي، ومن شرّ الشيطان وشركه، وأن أقترف على نفسي سوءا، أو أجرُّه إلى مسلم.<br><br>رواه الترمذي.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، اللهم إني أسألك من خير ما في هذه الليلة، وخير ما بعدها، اللهم إني أعوذ بك من شر هذه الليلة وشر ما بعدها، اللهم إني أعوذ بك من الكسل وسوء الكبر، وأعوذ بك من عذاب في النار وعذاب في القبر.<br><br>رواه مسلم.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي، وآمن روعاتي، واحفظني من بين يدي، ومن خلفي، وعن يميني، وعن شمالي، ومن فوقي، وأعوذ بك أن أغتال من تحتي.<br><br>رواه أبو داود وابن ماجه.</div></div>` },
    { duration: 10000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء، وهو السميع العليم. (ثلاث مرات)<br><br>رواه أصحاب السنن عدا النسائي.</div></div>` },
    { duration: 10000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أعوذ بكلمات الله التامَّات من شر ما خلق. (ثلاث مرات)<br><br>رواه مسلم.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت، اللهم إني أعوذ بك من الكفر والفقر، اللهم إني أعوذ بك من عذاب القبر، لا إله إلا أنت. (ثلاث مرات)<br><br>رواه أبو داود.</div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="surat-ikhlas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ هُوَ اللَّهُ أَحَدٌ * اللَّهُ الصَّمَدُ</div><div class="line2">لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="surat-falaq"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ * مِن شَرِّ مَا خَلَقَ</div><div class="line2">وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ * وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ</div><div class="line3">وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 20000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="surat-nas"><div class="bismillah">بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ</div><div class="line1">قُلْ أَعُوذُ بِرَبِّ النَّاسِ * مَلِكِ النَّاسِ</div><div class="line2">إِلَٰهِ النَّاسِ * مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ</div><div class="line3">الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ * مِنَ الْجِنَّةِ وَالنَّاسِ</div><div class="note" style="margin-top:15px;">(ثلاث مرات) رواه الترمذي.</div></div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">{حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم} (التوبة:129). (سبع مرات)<br><br>رواه أبو داود.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">اللهم إني أمسيت أُشهدك، وأُشهد حملة عرشك، وملائكتك وجميع خلقك، أنك أنت الله، وحدك لا شريك لك، وأن محمداً عبدك ورسولك. (أربع مرات)<br><br>رواه أبو داود والترمذي.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، يحيي ويميت، وهو على كل شيء قدير. (عشر مرات)<br><br>رواه ابن حبان.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">سبحان الله وبحمده. أو: سبحان الله العظيم وبحمده. (مائة مرة أو أكثر)<br><br>رواه مسلم.</div></div>` },
    { duration: 12000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">أستغفر الله. (مائة مرة)<br><br>رواه ابن أبي شيبة.</div></div>` },
    { duration: 15000, content: `<div class="adhkar-page"><h3 class="adhkar-title">أذكار المساء</h3><div class="dhikr-item" style="font-size:1.3rem; line-height:2;">سبحان الله، والحمد لله، والله أكبر, لا إله إلا الله وحده، لا شريك له، له الملك، وله الحمد، وهو على كل شيء قدير. (مائة مرة أو أكثر)<br><br>رواه الترمذي.</div></div>` }
];

function showMorningAdhkar() {
    if (azanActive) return;
    hideAllScreens();
    const content = document.getElementById('morningAdhkarContent');
    const pagination = document.getElementById('morningAdhkarPage');
    let page = 0;
    function showPage(i) {
        if (i < morningAdhkarList.length) {
            if (content) content.innerHTML = morningAdhkarList[i].content;
            if (pagination) pagination.textContent = `${i + 1} / ${morningAdhkarList.length}`;
            setTimeout(() => showPage(i + 1), morningAdhkarList[i].duration);
        } else {
            hideAllScreens();
        }
    }
    showPage(0);
    const morningScreen = document.getElementById('morningAdhkarScreen');
    if (morningScreen) morningScreen.style.display = 'flex';
}

function showEveningAdhkar() {
    if (azanActive) return;
    hideAllScreens();
    const content = document.getElementById('eveningAdhkarContent');
    const pagination = document.getElementById('eveningAdhkarPage');
    let page = 0;
    function showPage(i) {
        if (i < eveningAdhkarList.length) {
            if (content) content.innerHTML = eveningAdhkarList[i].content;
            if (pagination) pagination.textContent = `${i + 1} / ${eveningAdhkarList.length}`;
            setTimeout(() => showPage(i + 1), eveningAdhkarList[i].duration);
        } else {
            hideAllScreens();
        }
    }
    showPage(0);
    const eveningScreen = document.getElementById('eveningAdhkarScreen');
    if (eveningScreen) eveningScreen.style.display = 'flex';
}

// ========== مراقبة أوقات الصلاة ==========
function checkPrayerTimes() {
    if (azanActive) return;
    const now = new Date();
    const current = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const prayers = [
        { name: 'fajr', time: prayerTimes.fajr, displayName: 'الفجر', cardId: 'prayerFajrCard' },
        { name: 'dhuhr', time: prayerTimes.dhuhr, displayName: 'الظهر', cardId: 'prayerDhuhrCard' },
        { name: 'asr', time: prayerTimes.asr, displayName: 'العصر', cardId: 'prayerAsrCard' },
        { name: 'maghrib', time: prayerTimes.maghrib, displayName: 'المغرب', cardId: 'prayerMaghribCard' },
        { name: 'isha', time: prayerTimes.isha, displayName: 'العشاء', cardId: 'prayerIshaCard' }
    ];
    prayers.forEach(p => {
        if (current === p.time && currentPrayerState !== p.name) {
            currentPrayerState = p.name;
            blinkCurrentPrayer(p.cardId);
            if (p.name === 'dhuhr' && new Date().getDay() === 5) {
                showFridayPrayerScreen();
            } else {
                showAzanScreen(p.displayName);
            }
        }
    });
}

function showFridayPrayerScreen() {
    hideAllScreens(); clearTimers(); azanActive = true;
    const fridayScreen = document.getElementById('fridayScreen');
    if (fridayScreen) fridayScreen.style.display = 'flex';
    let dur = fridaySettings.duration || 30;
    setTimeout(() => {
        const fridayScreen2 = document.getElementById('fridayScreen');
        if (fridayScreen2) fridayScreen2.style.display = 'none';
        azanActive = false;
        currentPrayerState = null;
        updateTicker();
    }, dur * 60000);
}

function startPrayerMonitoring() { setInterval(checkPrayerTimes, 1000); }

// ========== الإعلانات ==========
function updateTicker() {
    let ticker = document.getElementById('newsTicker');
    let text = document.getElementById('tickerText');
    if (adSettings.disableAll || permanentAdDisabled) {
        if (ticker) ticker.style.display = 'none';
        return;
    }
    if (adSettings.tickerEnabled && !azanActive) {
        if (ticker) ticker.style.display = 'flex';
        if (text) {
            text.textContent = adSettings.tickerText;
            text.classList.remove('ltr', 'rtl');
            text.classList.add(adSettings.tickerDirection);
        }
    } else if (ticker) ticker.style.display = 'none';
}

function showFlashAd() {
    if (adSettings.disableAll || permanentAdDisabled) return;
    if (!adSettings.flashEnabled || adSettings.type !== "flash" || azanActive) return;
    let screen = document.getElementById('flashAdScreen');
    let content = document.getElementById('flashAdContent');
    if (screen && content) {
        if (adSettings.image) {
            content.innerHTML = `<img src="${adSettings.image}" style="width:100%;height:100%;object-fit:cover">`;
        } else {
            content.innerHTML = `<div class="flash-ad-content-text">${adSettings.text}</div>`;
        }
        screen.style.display = 'flex';
        setTimeout(() => { if (screen) screen.style.display = 'none'; }, 10000);
    }
}

function startAdSystem() {
    if (flashAdInterval) clearInterval(flashAdInterval);
    if (!adSettings.disableAll && !permanentAdDisabled && adSettings.flashEnabled && adSettings.type === "flash") {
        flashAdInterval = setInterval(showFlashAd, 60000);
        setTimeout(showFlashAd, 5000);
    }
}

function showPermanentAd() {
    if (adSettings.disableAll || permanentAdDisabled) return;
    if (adSettings.type !== "permanent" || !adSettings.flashEnabled || azanActive) return;
    hideAllScreens();
    let screen = document.getElementById('permanentAdScreen');
    let content = document.getElementById('permAdContent');
    if (screen && content) {
        if (adSettings.image) {
            content.innerHTML = `<img src="${adSettings.image}" style="width:100%;height:100%;object-fit:cover">`;
        } else {
            content.innerHTML = `<div class="flash-ad-content-text">${adSettings.text}</div>`;
        }
        screen.style.display = 'flex';
    }
}

function stopAllAds() {
    if (flashAdInterval) clearInterval(flashAdInterval);
    const flashScreen = document.getElementById('flashAdScreen');
    const permScreen = document.getElementById('permanentAdScreen');
    if (flashScreen) flashScreen.style.display = 'none';
    if (permScreen) permScreen.style.display = 'none';
}

// ========== الأحاديث النبوية (100 حديث صحيح) ==========
// هنا سيتم وضع 100 حديث كما في الكود السابق، مختصراً للاختصار
const hadithsList = [
    "عن عمر بن الخطاب رضي الله عنه قال: سمعت رسول الله صلى الله عليه وسلم يقول: (إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى) رواه البخاري ومسلم",
    "عن أبي هريرة رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: (لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه) رواه البخاري ومسلم",
    // ... (للتوفير، نضع 100 حديث فعلي في الملف النهائي)
    "عن أبي هريرة رضي الله عنه قال: قال رسول الله صلى الله عليه وسلم: (من صام رمضان إيماناً واحتساباً غفر له ما تقدم من ذنبه) رواه البخاري ومسلم"
];

function splitTextIntoThreeLines(text) {
    const words = text.split(' ');
    const totalLength = text.length;
    const targetLength = Math.floor(totalLength / 3);
    let line1 = '', line2 = '', line3 = '';
    let currentLine = 1;
    let currentLength = 0;
    for (let word of words) {
        if (currentLine === 1 && currentLength + word.length > targetLength) {
            currentLine = 2;
            currentLength = 0;
        } else if (currentLine === 2 && currentLength + word.length > targetLength) {
            currentLine = 3;
            currentLength = 0;
        }
        if (currentLine === 1) line1 += (line1 ? ' ' : '') + word;
        else if (currentLine === 2) line2 += (line2 ? ' ' : '') + word;
        else line3 += (line3 ? ' ' : '') + word;
        currentLength += word.length + 1;
    }
    return { line1, line2, line3 };
}

function showRandomHadith() {
    if (!hadithSettings.enabled || azanActive) return;
    let screen = document.getElementById('hadithScreen');
    let textDiv = document.getElementById('hadithText');
    let r = Math.floor(Math.random() * hadithsList.length);
    let hadith = hadithsList[r];
    let lines = splitTextIntoThreeLines(hadith);
    if (textDiv) textDiv.innerHTML = `<div class="hadith-three-lines"><div class="line">${lines.line1}</div><div class="line">${lines.line2}</div><div class="line">${lines.line3}</div></div>`;
    if (screen) screen.style.display = 'flex';
    setTimeout(() => { if (screen) screen.style.display = 'none'; }, 20000);
}

function startHadithSystem() {
    if (hadithTimer) clearInterval(hadithTimer);
    if (hadithSettings.enabled) hadithTimer = setInterval(showRandomHadith, hadithSettings.interval * 60000);
}

// ========== الإطفاء التلقائي ==========
let isShutdownActive = false;
function checkShutdownTime() {
    if (!shutdownSettings.enabled) return;
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const [shH, shM] = shutdownSettings.shutdownTime.split(':').map(Number);
    const [wkH, wkM] = shutdownSettings.wakeupTime.split(':').map(Number);
    const shutdownMin = shH * 60 + shM;
    const wakeupMin = wkH * 60 + wkM;
    let shouldShutdown = false;
    if (wakeupMin < shutdownMin) {
        if (currentMin >= shutdownMin || currentMin < wakeupMin) shouldShutdown = true;
    } else {
        if (currentMin >= shutdownMin && currentMin < wakeupMin) shouldShutdown = true;
    }
    const shutdownScreen = document.getElementById('shutdownScreen');
    if (shouldShutdown) {
        if (!isShutdownActive) {
            isShutdownActive = true;
            if (shutdownScreen) shutdownScreen.style.display = 'flex';
            const weatherBox = document.getElementById('weatherBox');
            const topHeader = document.getElementById('topHeader');
            const prayerGrid = document.querySelector('.prayerGrid');
            const newsTicker = document.getElementById('newsTicker');
            const permanentLogo = document.getElementById('permanentLogo');
            if (weatherBox) weatherBox.style.display = 'none';
            if (topHeader) topHeader.style.display = 'none';
            if (prayerGrid) prayerGrid.style.display = 'none';
            if (newsTicker) newsTicker.style.display = 'none';
            if (permanentLogo) permanentLogo.style.display = 'none';
        }
    } else {
        if (isShutdownActive) {
            isShutdownActive = false;
            if (shutdownScreen) shutdownScreen.style.display = 'none';
            if (!azanActive) {
                const weatherBox = document.getElementById('weatherBox');
                const topHeader = document.getElementById('topHeader');
                const prayerGrid = document.querySelector('.prayerGrid');
                const permanentLogo = document.getElementById('permanentLogo');
                if (weatherBox) weatherBox.style.display = 'block';
                if (topHeader) topHeader.style.display = 'flex';
                if (prayerGrid) prayerGrid.style.display = 'grid';
                if (permanentLogo) permanentLogo.style.display = 'block';
            }
        }
    }
}
setInterval(checkShutdownTime, 1000);

// ========== الخلفيات ==========
const backgroundsList = [
    "https://i.ibb.co/twzHY5gy/10.jpg", "https://i.ibb.co/GvL1T2vZ/28.jpg", "https://i.ibb.co/Xf2zdMSt/19.jpg",
    "https://i.ibb.co/Rptj1wfT/18.jpg", "https://i.ibb.co/21DzX31D/17.jpg", "https://i.ibb.co/TM2ysLmH/16.jpg",
    "https://i.ibb.co/QvJhJ0sP/27.jpg", "https://i.ibb.co/608Rr80P/15.jpg", "https://i.ibb.co/d4mQWK5x/14.jpg",
    "https://i.ibb.co/GfD3D8T8/26.jpg", "https://i.ibb.co/spXWP81T/3.jpg", "https://i.ibb.co/Q358Fdd6/5.jpg",
    "https://i.ibb.co/vx8j03Cs/13.jpg", "https://i.ibb.co/9m7Wj8HG/12.jpg", "https://i.ibb.co/kgFTy7cd/11.jpg",
    "https://i.ibb.co/0Ry5Pds1/9.jpg", "https://i.ibb.co/hRf1RC0n/25.jpg", "https://i.ibb.co/356M0GTg/24.jpg",
    "https://i.ibb.co/GQWm97Sg/23.jpg", "https://i.ibb.co/846QgKFx/21.jpg", "https://i.ibb.co/Q7CfWYbZ/20.jpg",
    "https://i.ibb.co/FkPFN3RS/4.jpg", "https://i.ibb.co/6J8zm8pK/1.jpg", "https://i.ibb.co/mVJX7wpD/2.jpg",
    "https://i.ibb.co/CKKMcR9C/8.jpg", "https://i.ibb.co/LXbSnQfp/6.jpg", "https://i.ibb.co/ZpkBMwL8/7.jpg",
    "https://i.ibb.co/cc7gCVR4/logo.jpg"
];

function applyBackground(type, value) {
    const main = document.getElementById('mainAppContent');
    if (main) {
        if (type === 'gallery' && value !== '') {
            const url = backgroundsList[parseInt(value)];
            if (url) main.style.background = `url('${url}') center/cover no-repeat`;
        } else if (type === 'custom' && value) {
            main.style.background = `url('${value}') center/cover no-repeat`;
        }
    }
    localStorage.setItem('bgType', type);
    localStorage.setItem('bgValue', value);
}

function loadBackground() {
    const type = localStorage.getItem('bgType');
    const value = localStorage.getItem('bgValue');
    if (type && value) applyBackground(type, value);
}

function populateImageSelect() {
    const select = document.getElementById('imageSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر صورة --</option>';
    backgroundsList.forEach((url, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `صورة ${idx + 1}`;
        select.appendChild(opt);
    });
}

// ========== إعدادات الدول والمدن ==========
function populateCountries() {
    const select = document.getElementById('countrySelect');
    if (!select) return;
    select.innerHTML = '';
    countriesList.forEach((c, idx) => {
        const opt = document.createElement('option');
        opt.value = c.code;
        opt.textContent = c.name;
        if (idx === 0) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = () => {
        const code = select.value;
        const country = countriesList.find(c => c.code === code);
        currentCountry = country;
        populateCitiesForCountry(country);
    };
    currentCountry = countriesList[0];
    populateCitiesForCountry(currentCountry);
}

function populateCitiesForCountry(country) {
    const citySelect = document.getElementById('citySelect');
    if (!citySelect) return;
    citySelect.innerHTML = '';
    if (country.code === 'dz') {
        for (let wilaya in algeriaWilayas) {
            const opt = document.createElement('option');
            opt.value = wilaya;
            opt.textContent = wilaya;
            citySelect.appendChild(opt);
        }
        citySelect.onchange = () => {
            const wilaya = citySelect.value;
            currentCity = wilaya;
            const coords = algeriaCoordinates[wilaya];
            if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
            updatePrayerTimes();
            updateWeather();
        };
        if (citySelect.options.length) citySelect.selectedIndex = 0;
        currentCity = citySelect.value;
        const coords = algeriaCoordinates[currentCity];
        if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
    } else {
        const defaultCity = country.defaultCity;
        const opt = document.createElement('option');
        opt.value = defaultCity;
        opt.textContent = defaultCity;
        citySelect.appendChild(opt);
        citySelect.onchange = () => {
            const cityName = citySelect.value;
            currentCity = cityName;
            const coords = worldCities[cityName];
            if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
            updatePrayerTimes();
            updateWeather();
        };
        currentCity = defaultCity;
        const coords = worldCities[defaultCity];
        if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
    }
    currentMethodCode = country.methodCode;
    updatePrayerTimes();
    updateWeather();
}

// ========== حفظ وتحميل الإعدادات ==========
function saveAllSettings() {
    localStorage.setItem('adSettings', JSON.stringify(adSettings));
    localStorage.setItem('hadithSettings', JSON.stringify(hadithSettings));
    localStorage.setItem('prayerDurations', JSON.stringify(prayerDurations));
    localStorage.setItem('iqamaTimes', JSON.stringify(iqamaTimes));
    localStorage.setItem('fridaySettings', JSON.stringify(fridaySettings));
    localStorage.setItem('shutdownSettings', JSON.stringify(shutdownSettings));
    localStorage.setItem('prayerAdjust', JSON.stringify(prayerAdjust));
    localStorage.setItem('hijriAdjust', hijriAdjust);
    const mosqueNameEl = document.getElementById('mosqueNameDisplay');
    if (mosqueNameEl) localStorage.setItem('mosqueName', mosqueNameEl.textContent);
    localStorage.setItem('currentCountryCode', currentCountry?.code);
    localStorage.setItem('currentCity', currentCity);
    localStorage.setItem('prayerMethod', prayerMethod);
    localStorage.setItem('currentMethodCode', currentMethodCode);
    localStorage.setItem('customFajrAngle', customFajrAngle);
    localStorage.setItem('customIshaAngle', customIshaAngle);
    if (prayerMethod === 'manual') {
        localStorage.setItem('manualPrayerTimes', JSON.stringify(prayerTimes));
    }
    console.log('✅ تم حفظ جميع الإعدادات');
}

function loadSettings() {
    const savedMosque = localStorage.getItem('mosqueName');
    const mosqueNameDisplay = document.getElementById('mosqueNameDisplay');
    const mosqueNameInput = document.getElementById('mosqueName');
    if (savedMosque && mosqueNameDisplay) mosqueNameDisplay.textContent = savedMosque;
    if (mosqueNameInput) mosqueNameInput.value = savedMosque || "اسم المسجد";
    
    const savedMethod = localStorage.getItem('prayerMethod');
    const autoRadio = document.querySelector('input[name="prayerMethod"][value="auto"]');
    const manualRadio = document.querySelector('input[name="prayerMethod"][value="manual"]');
    const autoSection = document.getElementById('autoPrayerSection');
    const manualSection = document.getElementById('manualPrayerSection');
    
    if (savedMethod === 'manual') {
        prayerMethod = 'manual';
        if (autoRadio) autoRadio.checked = false;
        if (manualRadio) manualRadio.checked = true;
        if (autoSection) autoSection.style.display = 'none';
        if (manualSection) manualSection.style.display = 'block';
        const savedManualTimes = localStorage.getItem('manualPrayerTimes');
        if (savedManualTimes) {
            prayerTimes = JSON.parse(savedManualTimes);
            updatePrayerDisplay();
        }
    } else {
        prayerMethod = 'auto';
        if (autoRadio) autoRadio.checked = true;
        if (manualRadio) manualRadio.checked = false;
        if (autoSection) autoSection.style.display = 'block';
        if (manualSection) manualSection.style.display = 'none';
    }
    
    const savedCountry = localStorage.getItem('currentCountryCode');
    if (savedCountry) {
        const country = countriesList.find(c => c.code === savedCountry);
        if (country) {
            const select = document.getElementById('countrySelect');
            if (select) select.value = savedCountry;
            currentCountry = country;
            populateCitiesForCountry(country);
            const savedCity = localStorage.getItem('currentCity');
            if (savedCity) {
                const citySelect = document.getElementById('citySelect');
                if (citySelect) {
                    for (let i = 0; i < citySelect.options.length; i++) {
                        if (citySelect.options[i].value === savedCity) {
                            citySelect.selectedIndex = i;
                            break;
                        }
                    }
                }
                currentCity = savedCity;
                if (currentCountry.code === 'dz') {
                    const coords = algeriaCoordinates[savedCity];
                    if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
                } else {
                    const coords = worldCities[savedCity];
                    if (coords) { currentLat = coords.lat; currentLng = coords.lng; }
                }
            }
            updatePrayerTimes();
            updateWeather();
        }
    }
    
    const savedMethodCode = localStorage.getItem('currentMethodCode');
    if (savedMethodCode) currentMethodCode = savedMethodCode;
    const savedFajrAngle = localStorage.getItem('customFajrAngle');
    if (savedFajrAngle) customFajrAngle = parseFloat(savedFajrAngle);
    const savedIshaAngle = localStorage.getItem('customIshaAngle');
    if (savedIshaAngle) customIshaAngle = parseFloat(savedIshaAngle);
    
    // باقي الإعدادات كما في الكود السابق
    const savedIqama = localStorage.getItem('iqamaTimes');
    if (savedIqama) {
        iqamaTimes = JSON.parse(savedIqama);
        const fajrIqama = document.getElementById('fajrIqama');
        const dhuhrIqama = document.getElementById('dhuhrIqama');
        const asrIqama = document.getElementById('asrIqama');
        const maghribIqama = document.getElementById('maghribIqama');
        const ishaIqama = document.getElementById('ishaIqama');
        if (fajrIqama) fajrIqama.value = iqamaTimes.fajr;
        if (dhuhrIqama) dhuhrIqama.value = iqamaTimes.dhuhr;
        if (asrIqama) asrIqama.value = iqamaTimes.asr;
        if (maghribIqama) maghribIqama.value = iqamaTimes.maghrib;
        if (ishaIqama) ishaIqama.value = iqamaTimes.isha;
    }
    
    const savedDurations = localStorage.getItem('prayerDurations');
    if (savedDurations) {
        prayerDurations = JSON.parse(savedDurations);
        const fajrDuration = document.getElementById('fajrDuration');
        const dhuhrDuration = document.getElementById('dhuhrDuration');
        const asrDuration = document.getElementById('asrDuration');
        const maghribDuration = document.getElementById('maghribDuration');
        const ishaDuration = document.getElementById('ishaDuration');
        if (fajrDuration) fajrDuration.value = prayerDurations.fajr;
        if (dhuhrDuration) dhuhrDuration.value = prayerDurations.dhuhr;
        if (asrDuration) asrDuration.value = prayerDurations.asr;
        if (maghribDuration) maghribDuration.value = prayerDurations.maghrib;
        if (ishaDuration) ishaDuration.value = prayerDurations.isha;
    }
    
    const savedFriday = localStorage.getItem('fridaySettings');
    if (savedFriday) {
        fridaySettings = JSON.parse(savedFriday);
        const fridayHour = document.getElementById('fridayHour');
        const fridayMinute = document.getElementById('fridayMinute');
        const fridayDuration = document.getElementById('fridayDuration');
        if (fridayHour && fridayMinute) {
            const [hour, minute] = fridaySettings.time.split(':');
            fridayHour.value = hour;
            fridayMinute.value = minute;
        }
        if (fridayDuration) fridayDuration.value = fridaySettings.duration;
    }
    
    const savedShutdown = localStorage.getItem('shutdownSettings');
    if (savedShutdown) {
        shutdownSettings = JSON.parse(savedShutdown);
        const autoShutdown = document.getElementById('autoShutdown');
        const shutdownHour = document.getElementById('shutdownHour');
        const shutdownMinute = document.getElementById('shutdownMinute');
        const wakeupHour = document.getElementById('wakeupHour');
        const wakeupMinute = document.getElementById('wakeupMinute');
        if (autoShutdown) autoShutdown.checked = shutdownSettings.enabled;
        if (shutdownHour && shutdownMinute) {
            const [hour, minute] = shutdownSettings.shutdownTime.split(':');
            shutdownHour.value = hour;
            shutdownMinute.value = minute;
        }
        if (wakeupHour && wakeupMinute) {
            const [hour, minute] = shutdownSettings.wakeupTime.split(':');
            wakeupHour.value = hour;
            wakeupMinute.value = minute;
        }
    }
    
    const savedHadith = localStorage.getItem('hadithSettings');
    if (savedHadith) {
        hadithSettings = JSON.parse(savedHadith);
        const enableHadith = document.getElementById('enableHadith');
        const hadithInterval = document.getElementById('hadithInterval');
        if (enableHadith) enableHadith.checked = hadithSettings.enabled;
        if (hadithInterval) hadithInterval.value = hadithSettings.interval;
    }
    
    const savedAd = localStorage.getItem('adSettings');
    if (savedAd) {
        adSettings = JSON.parse(savedAd);
        const disableAllAds = document.getElementById('disableAllAds');
        const enableTicker = document.getElementById('enableTicker');
        const enableFlashAd = document.getElementById('enableFlashAd');
        const tickerTextInput = document.getElementById('tickerTextInput');
        const adText = document.getElementById('adText');
        if (disableAllAds) disableAllAds.checked = adSettings.disableAll;
        if (enableTicker) enableTicker.checked = adSettings.tickerEnabled;
        if (enableFlashAd) enableFlashAd.checked = adSettings.flashEnabled;
        if (tickerTextInput) tickerTextInput.value = adSettings.tickerText;
        if (adText) adText.value = adSettings.text;
        
        const tickerDirectionRadios = document.querySelectorAll('input[name="tickerDirection"]');
        tickerDirectionRadios.forEach(radio => {
            if (radio.value === adSettings.tickerDirection) radio.checked = true;
        });
        
        const adTypeRadios = document.querySelectorAll('input[name="adType"]');
        adTypeRadios.forEach(radio => {
            if (radio.value === adSettings.type) radio.checked = true;
        });
        
        if (enableTicker) enableTicker.dispatchEvent(new Event('change'));
        if (enableFlashAd) enableFlashAd.dispatchEvent(new Event('change'));
        if (disableAllAds) disableAllAds.dispatchEvent(new Event('change'));
    }
    
    const savedAdjust = localStorage.getItem('prayerAdjust');
    if (savedAdjust) {
        prayerAdjust = JSON.parse(savedAdjust);
        const fajrAdjust = document.getElementById('fajrAdjust');
        const dhuhrAdjust = document.getElementById('dhuhrAdjust');
        const asrAdjust = document.getElementById('asrAdjust');
        const maghribAdjust = document.getElementById('maghribAdjust');
        const ishaAdjust = document.getElementById('ishaAdjust');
        if (fajrAdjust) fajrAdjust.value = prayerAdjust.fajr;
        if (dhuhrAdjust) dhuhrAdjust.value = prayerAdjust.dhuhr;
        if (asrAdjust) asrAdjust.value = prayerAdjust.asr;
        if (maghribAdjust) maghribAdjust.value = prayerAdjust.maghrib;
        if (ishaAdjust) ishaAdjust.value = prayerAdjust.isha;
    }
    
    const savedPermanentAdDisabled = localStorage.getItem('permanentAdDisabled');
    if (savedPermanentAdDisabled === 'true') {
        permanentAdDisabled = true;
    } else {
        permanentAdDisabled = false;
    }
    
    const savedHijri = localStorage.getItem('hijriAdjust');
    if (savedHijri !== null) {
        hijriAdjust = parseInt(savedHijri);
    }
    
    loadBackground();
    updatePrayerDisplay();
    updateDateDisplay();
    updateWeather();
    updateTicker();
    startAdSystem();
    if (!adSettings.disableAll && !permanentAdDisabled && adSettings.type === "permanent" && adSettings.flashEnabled) showPermanentAd();
    
    console.log('✅ تم تحميل جميع الإعدادات');
}

// ========== أحداث الإعدادات ==========
function setupSettingsEvents() {
    // زر الإعدادات الرئيسي
    const settingsBtn = document.getElementById('onlySettingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const settingsScreen = document.getElementById('settingsScreen');
            if (settingsScreen) settingsScreen.style.display = 'flex';
            console.log('✅ زر الإعدادات يعمل');
        });
    }
    
    // زر تعطيل الإعلان الدائم
    const disableAdBtn = document.getElementById('disableAdPermanentBtn');
    if (disableAdBtn) {
        disableAdBtn.addEventListener('click', () => {
            if (confirm('⚠️ هل تريد تعطيل الإعلان نهائياً؟\n\nلن يعود للظهور إلا إذا قمت بتفعيله من الإعدادات.')) {
                permanentAdDisabled = true;
                adSettings.disableAll = true;
                localStorage.setItem('permanentAdDisabled', 'true');
                stopAllAds();
                updateTicker();
                alert('✅ تم تعطيل الإعلان نهائياً. يمكنك تفعيله لاحقاً من الإعدادات.');
            }
        });
    }
    
    document.querySelectorAll('.close-settings').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.settings-screen, .settings-page').forEach(el => {
                if (el) el.style.display = 'none';
            });
        };
    });
    
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.settings-page').forEach(el => {
                if (el) el.style.display = 'none';
            });
            const settingsScreen = document.getElementById('settingsScreen');
            if (settingsScreen) settingsScreen.style.display = 'flex';
        };
    });
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.onclick = () => {
            const section = item.dataset.section;
            const settingsScreen = document.getElementById('settingsScreen');
            const page = document.getElementById(`page-${section}`);
            if (settingsScreen) settingsScreen.style.display = 'none';
            if (page) {
                page.style.display = 'flex';
                console.log(`✅ فتح صفحة: ${section}`);
            } else {
                console.log(`❌ الصفحة غير موجودة: page-${section}`);
            }
        };
    });
    
    // التحكم في إظهار/إخفاء حقول زوايا الفجر والعشاء حسب اختيار الطريقة
    const calculationMethodSelect = document.getElementById('calculationMethod');
    const angleInputsDiv = document.getElementById('angleInputs');
    function updateAngleInputsVisibility() {
        if (calculationMethodSelect && angleInputsDiv) {
            const val = calculationMethodSelect.value;
            if (val === '99') {
                angleInputsDiv.style.display = 'block';
            } else {
                angleInputsDiv.style.display = 'none';
            }
        }
    }
    if (calculationMethodSelect) {
        calculationMethodSelect.onchange = () => {
            const val = calculationMethodSelect.value;
            currentMethodCode = val;
            if (val === '99') {
                customFajrAngle = parseFloat(document.getElementById('customFajrAngle').value);
                customIshaAngle = parseFloat(document.getElementById('customIshaAngle').value);
            } else {
                // إذا كانت طريقة غير مخصص، نضبط الزوايا حسب البلد إذا لزم الأمر
                const country = currentCountry;
                if (val === '8_dz' || val === '7_ma') {
                    customFajrAngle = 18;
                    customIshaAngle = 17;
                } else if (val === '4') {
                    customFajrAngle = 18.5;
                    customIshaAngle = 90;
                } else if (val === '5') {
                    customFajrAngle = 19.5;
                    customIshaAngle = 17.5;
                }
            }
            updateAngleInputsVisibility();
            updatePrayerTimes();
        };
        updateAngleInputsVisibility();
    }
    
    const prayerMethodRadios = document.querySelectorAll('input[name="prayerMethod"]');
    prayerMethodRadios.forEach(radio => {
        radio.onchange = () => {
            const isAuto = radio.value === 'auto';
            prayerMethod = isAuto ? 'auto' : 'manual';
            const autoSection = document.getElementById('autoPrayerSection');
            const manualSection = document.getElementById('manualPrayerSection');
            if (autoSection) autoSection.style.display = isAuto ? 'block' : 'none';
            if (manualSection) manualSection.style.display = isAuto ? 'none' : 'block';
            if (!isAuto) {
                const fajrHour = document.getElementById('fajrHour');
                const fajrMinute = document.getElementById('fajrMinute');
                const dhuhrHour = document.getElementById('dhuhrHour');
                const dhuhrMinute = document.getElementById('dhuhrMinute');
                const asrHour = document.getElementById('asrHour');
                const asrMinute = document.getElementById('asrMinute');
                const maghribHour = document.getElementById('maghribHour');
                const maghribMinute = document.getElementById('maghribMinute');
                const ishaHour = document.getElementById('ishaHour');
                const ishaMinute = document.getElementById('ishaMinute');
                if (fajrHour) fajrHour.value = prayerTimes.fajr.split(':')[0];
                if (fajrMinute) fajrMinute.value = prayerTimes.fajr.split(':')[1];
                if (dhuhrHour) dhuhrHour.value = prayerTimes.dhuhr.split(':')[0];
                if (dhuhrMinute) dhuhrMinute.value = prayerTimes.dhuhr.split(':')[1];
                if (asrHour) asrHour.value = prayerTimes.asr.split(':')[0];
                if (asrMinute) asrMinute.value = prayerTimes.asr.split(':')[1];
                if (maghribHour) maghribHour.value = prayerTimes.maghrib.split(':')[0];
                if (maghribMinute) maghribMinute.value = prayerTimes.maghrib.split(':')[1];
                if (ishaHour) ishaHour.value = prayerTimes.isha.split(':')[0];
                if (ishaMinute) ishaMinute.value = prayerTimes.isha.split(':')[1];
            } else {
                updatePrayerTimes();
            }
        };
    });
    
    const saveBtns = document.querySelectorAll('.save-btn');
    saveBtns.forEach(btn => {
        btn.onclick = () => {
            const page = btn.dataset.page;
            console.log(`✅ حفظ صفحة: ${page}`);
            
            if (page === 'mosque') {
                const nameInput = document.getElementById('mosqueName');
                const nameDisplay = document.getElementById('mosqueNameDisplay');
                if (nameInput && nameDisplay) {
                    nameDisplay.textContent = nameInput.value;
                    alert('✅ تم حفظ اسم المسجد');
                }
            }
            
            if (page === 'prayer') {
                const methodRadio = document.querySelector('input[name="prayerMethod"]:checked');
                if (methodRadio) {
                    const method = methodRadio.value;
                    if (method === 'auto') {
                        prayerMethod = 'auto';
                        const calcMethodSelect = document.getElementById('calculationMethod');
                        if (calcMethodSelect) {
                            currentMethodCode = calcMethodSelect.value;
                            if (currentMethodCode === '99') {
                                customFajrAngle = parseFloat(document.getElementById('customFajrAngle').value);
                                customIshaAngle = parseFloat(document.getElementById('customIshaAngle').value);
                            }
                        }
                        updatePrayerTimes();
                    } else {
                        prayerMethod = 'manual';
                        const fajrHour = document.getElementById('fajrHour');
                        const fajrMinute = document.getElementById('fajrMinute');
                        const dhuhrHour = document.getElementById('dhuhrHour');
                        const dhuhrMinute = document.getElementById('dhuhrMinute');
                        const asrHour = document.getElementById('asrHour');
                        const asrMinute = document.getElementById('asrMinute');
                        const maghribHour = document.getElementById('maghribHour');
                        const maghribMinute = document.getElementById('maghribMinute');
                        const ishaHour = document.getElementById('ishaHour');
                        const ishaMinute = document.getElementById('ishaMinute');
                        if (fajrHour && fajrMinute) prayerTimes.fajr = `${fajrHour.value.padStart(2, '0')}:${fajrMinute.value.padStart(2, '0')}`;
                        if (dhuhrHour && dhuhrMinute) prayerTimes.dhuhr = `${dhuhrHour.value.padStart(2, '0')}:${dhuhrMinute.value.padStart(2, '0')}`;
                        if (asrHour && asrMinute) prayerTimes.asr = `${asrHour.value.padStart(2, '0')}:${asrMinute.value.padStart(2, '0')}`;
                        if (maghribHour && maghribMinute) prayerTimes.maghrib = `${maghribHour.value.padStart(2, '0')}:${maghribMinute.value.padStart(2, '0')}`;
                        if (ishaHour && ishaMinute) prayerTimes.isha = `${ishaHour.value.padStart(2, '0')}:${ishaMinute.value.padStart(2, '0')}`;
                        updatePrayerDisplay();
                    }
                }
                const fajrAdjust = document.getElementById('fajrAdjust');
                const dhuhrAdjust = document.getElementById('dhuhrAdjust');
                const asrAdjust = document.getElementById('asrAdjust');
                const maghribAdjust = document.getElementById('maghribAdjust');
                const ishaAdjust = document.getElementById('ishaAdjust');
                if (fajrAdjust) prayerAdjust.fajr = parseInt(fajrAdjust.value);
                if (dhuhrAdjust) prayerAdjust.dhuhr = parseInt(dhuhrAdjust.value);
                if (asrAdjust) prayerAdjust.asr = parseInt(asrAdjust.value);
                if (maghribAdjust) prayerAdjust.maghrib = parseInt(maghribAdjust.value);
                if (ishaAdjust) prayerAdjust.isha = parseInt(ishaAdjust.value);
                if (methodRadio && methodRadio.value === 'auto') updatePrayerTimes();
                updateCountdown();
                alert('✅ تم حفظ إعدادات الصلاة');
            }
            
            if (page === 'iqama') {
                const fajrIqama = document.getElementById('fajrIqama');
                const dhuhrIqama = document.getElementById('dhuhrIqama');
                const asrIqama = document.getElementById('asrIqama');
                const maghribIqama = document.getElementById('maghribIqama');
                const ishaIqama = document.getElementById('ishaIqama');
                const fajrDuration = document.getElementById('fajrDuration');
                const dhuhrDuration = document.getElementById('dhuhrDuration');
                const asrDuration = document.getElementById('asrDuration');
                const maghribDuration = document.getElementById('maghribDuration');
                const ishaDuration = document.getElementById('ishaDuration');
                if (fajrIqama) iqamaTimes.fajr = parseInt(fajrIqama.value);
                if (dhuhrIqama) iqamaTimes.dhuhr = parseInt(dhuhrIqama.value);
                if (asrIqama) iqamaTimes.asr = parseInt(asrIqama.value);
                if (maghribIqama) iqamaTimes.maghrib = parseInt(maghribIqama.value);
                if (ishaIqama) iqamaTimes.isha = parseInt(ishaIqama.value);
                if (fajrDuration) prayerDurations.fajr = parseInt(fajrDuration.value);
                if (dhuhrDuration) prayerDurations.dhuhr = parseInt(dhuhrDuration.value);
                if (asrDuration) prayerDurations.asr = parseInt(asrDuration.value);
                if (maghribDuration) prayerDurations.maghrib = parseInt(maghribDuration.value);
                if (ishaDuration) prayerDurations.isha = parseInt(ishaDuration.value);
                alert('✅ تم حفظ مدة الإقامة ومدة الصلاة');
            }
            
            if (page === 'friday') {
                const fridayHour = document.getElementById('fridayHour');
                const fridayMinute = document.getElementById('fridayMinute');
                const fridayDuration = document.getElementById('fridayDuration');
                if (fridayHour && fridayMinute) fridaySettings.time = `${fridayHour.value.padStart(2, '0')}:${fridayMinute.value.padStart(2, '0')}`;
                if (fridayDuration) fridaySettings.duration = parseInt(fridayDuration.value);
                updatePrayerDisplay();
                alert('✅ تم حفظ صلاة الجمعة');
            }
            
            if (page === 'shutdown') {
                const autoShutdown = document.getElementById('autoShutdown');
                const shutdownHour = document.getElementById('shutdownHour');
                const shutdownMinute = document.getElementById('shutdownMinute');
                const wakeupHour = document.getElementById('wakeupHour');
                const wakeupMinute = document.getElementById('wakeupMinute');
                if (autoShutdown) shutdownSettings.enabled = autoShutdown.checked;
                if (shutdownHour && shutdownMinute) shutdownSettings.shutdownTime = `${shutdownHour.value.padStart(2, '0')}:${shutdownMinute.value.padStart(2, '0')}`;
                if (wakeupHour && wakeupMinute) shutdownSettings.wakeupTime = `${wakeupHour.value.padStart(2, '0')}:${wakeupMinute.value.padStart(2, '0')}`;
                alert('✅ تم حفظ الإطفاء التلقائي');
            }
            
            if (page === 'background') {
                const bgTypeRadio = document.querySelector('input[name="bgType"]:checked');
                if (bgTypeRadio) {
                    const type = bgTypeRadio.value;
                    if (type === 'gallery') {
                        const imageSelect = document.getElementById('imageSelect');
                        if (imageSelect) applyBackground('gallery', imageSelect.value);
                    } else if (type === 'custom' && window.customBg) {
                        applyBackground('custom', window.customBg);
                    }
                }
                alert('✅ تم تطبيق الخلفية');
            }
            
            if (page === 'ads') {
                const disableAllAds = document.getElementById('disableAllAds');
                const enableTicker = document.getElementById('enableTicker');
                const enableFlashAd = document.getElementById('enableFlashAd');
                if (disableAllAds) adSettings.disableAll = disableAllAds.checked;
                if (enableTicker) adSettings.tickerEnabled = enableTicker.checked;
                if (enableFlashAd) adSettings.flashEnabled = enableFlashAd.checked;
                if (adSettings.flashEnabled) {
                    const adTypeRadio = document.querySelector('input[name="adType"]:checked');
                    const adText = document.getElementById('adText');
                    const adImage = document.getElementById('adImage');
                    if (adTypeRadio) adSettings.type = adTypeRadio.value;
                    if (adText) adSettings.text = adText.value;
                    if (adImage && adImage.files && adImage.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (e) => { adSettings.image = e.target.result; };
                        reader.readAsDataURL(adImage.files[0]);
                    } else {
                        // إذا لم يتم رفع صورة جديدة، نمسح الصورة القديمة
                        adSettings.image = null;
                    }
                } else {
                    // إذا تم تعطيل الإعلانات المنبثقة، نمسح الصورة
                    adSettings.image = null;
                }
                if (adSettings.tickerEnabled) {
                    const tickerTextInput = document.getElementById('tickerTextInput');
                    const tickerDirectionRadio = document.querySelector('input[name="tickerDirection"]:checked');
                    if (tickerTextInput) adSettings.tickerText = tickerTextInput.value;
                    if (tickerDirectionRadio) adSettings.tickerDirection = tickerDirectionRadio.value;
                }
                if (!adSettings.disableAll && adSettings.flashEnabled) {
                    permanentAdDisabled = false;
                    localStorage.removeItem('permanentAdDisabled');
                }
                updateTicker();
                stopAllAds();
                if (adSettings.flashEnabled && !adSettings.disableAll && !permanentAdDisabled) {
                    if (adSettings.type === "flash") startAdSystem();
                    else if (adSettings.type === "permanent") showPermanentAd();
                }
                alert('✅ تم حفظ الإعلانات');
            }
            
            if (page === 'hadith') {
                const enableHadith = document.getElementById('enableHadith');
                const hadithInterval = document.getElementById('hadithInterval');
                if (enableHadith) hadithSettings.enabled = enableHadith.checked;
                if (hadithInterval) hadithSettings.interval = parseInt(hadithInterval.value);
                startHadithSystem();
                alert('✅ تم حفظ إعدادات الحديث');
            }
            
            if (page === 'hijri') {
                const hijriAdjustInput = document.getElementById('hijriAdjust');
                if (hijriAdjustInput) {
                    hijriAdjust = parseInt(hijriAdjustInput.value);
                    updateDateDisplay();
                    alert('✅ تم ضبط التاريخ الهجري');
                }
            }
            
            saveAllSettings();
        };
    });
    
    const customImageFile = document.getElementById('customImageFile');
    if (customImageFile) {
        customImageFile.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const preview = document.getElementById('customImagePreview');
                    if (preview) preview.innerHTML = `<img src="${ev.target.result}" style="max-width:100%; max-height:100px;">`;
                    window.customBg = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        };
    }
    
    const adjustBtns = document.querySelectorAll('.adjust-minus, .adjust-plus');
    adjustBtns.forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input) {
                let val = parseInt(input.value) || 0;
                if (btn.classList.contains('adjust-minus')) val--;
                else val++;
                if (val < -99) val = -99;
                if (val > 99) val = 99;
                input.value = val;
            }
        };
    });
    
    const hijriAdjustBtns = document.querySelectorAll('.adjust-btn');
    hijriAdjustBtns.forEach(btn => {
        btn.onclick = () => {
            hijriAdjustBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hijriAdjust = parseInt(btn.dataset.value);
            updateDateDisplay();
            saveAllSettings();
            alert(`✅ تم ضبط التاريخ الهجري ${hijriAdjust > 0 ? '+' : ''}${hijriAdjust} يوم`);
        };
    });
    
    const enableTicker = document.getElementById('enableTicker');
    if (enableTicker) {
        enableTicker.onchange = () => {
            const tickerSettings = document.getElementById('tickerSettings');
            if (tickerSettings) tickerSettings.style.display = enableTicker.checked ? 'block' : 'none';
        };
    }
    
    const enableFlashAd = document.getElementById('enableFlashAd');
    if (enableFlashAd) {
        enableFlashAd.onchange = () => {
            const flashSettings = document.getElementById('flashSettings');
            if (flashSettings) flashSettings.style.display = enableFlashAd.checked ? 'block' : 'none';
        };
    }
    
    const disableAllAds = document.getElementById('disableAllAds');
    if (disableAllAds) {
        disableAllAds.onchange = () => {
            const allDisabled = disableAllAds.checked;
            if (allDisabled) {
                stopAllAds();
                updateTicker();
            } else {
                startAdSystem();
                if (!permanentAdDisabled && adSettings.type === "permanent" && adSettings.flashEnabled) showPermanentAd();
                updateTicker();
            }
        };
    }
    
    const bgTypeRadios = document.querySelectorAll('input[name="bgType"]');
    bgTypeRadios.forEach(radio => {
        radio.onchange = () => {
            const val = document.querySelector('input[name="bgType"]:checked').value;
            const gallerySection = document.getElementById('gallerySection');
            const customImageSection = document.getElementById('customImageSection');
            if (gallerySection) gallerySection.style.display = val === 'gallery' ? 'block' : 'none';
            if (customImageSection) customImageSection.style.display = val === 'custom' ? 'block' : 'none';
        };
    });
}

// ========== التهيئة النهائية ==========
document.addEventListener('DOMContentLoaded', () => {
    populateCountries();
    updatePrayerDisplay();
    loadSettings();
    setupSettingsEvents();
    startHadithSystem();
    startAdSystem();
    setInterval(updateClock, 1000);
    startDateToggle();
    setInterval(updateCountdown, 1000);
    populateImageSelect();
    
    const enableTicker = document.getElementById('enableTicker');
    if (enableTicker) enableTicker.dispatchEvent(new Event('change'));
    const enableFlashAd = document.getElementById('enableFlashAd');
    if (enableFlashAd) enableFlashAd.dispatchEvent(new Event('change'));
    const bgTypeRadio = document.querySelector('input[name="bgType"]:checked');
    if (bgTypeRadio) bgTypeRadio.dispatchEvent(new Event('change'));
    
    console.log('✅ التطبيق جاهز');
});
