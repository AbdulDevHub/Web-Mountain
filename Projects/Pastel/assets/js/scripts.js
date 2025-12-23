// Displaying Elements
var main = document.getElementsByTagName('body');
var content = document.getElementById('main-content');
var numberval = document.getElementById('number');
var hex = document.getElementById('hex');
var rgb = document.getElementById('rgb');
var hsl = document.getElementById('hsl');
var cmyk = document.getElementById('cmyk');
var icon = document.getElementById('github');
var clipboard = document.getElementById('clipboard');
var title = document.getElementById('title');

changeBgColor();

function copyToClipboard(e) {
	if (!e) var e = window.event;
	e.cancelBubble = true;
	if (e.stopPropagation) e.stopPropagation();
	var hexvalue = document.getElementById('hex').innerHTML.slice(6);
	console.log('linear-gradient(35deg, ' + hexvalue + ')');
	navigator.clipboard.writeText('linear-gradient(35deg, ' + hexvalue + ');').then(() => {
		//clipboard.classList.replace('fa-clipboard', 'fa-clipboard-check');
		title.innerHTML = 'COPIED   <i class="fas fa-clipboard-check" id="clipboard" aria-hidden="true"></i>';
	});
}

function genRandom() {
	var randomNum = (Math.floor(Math.random() * 156) + 100).toString(16).padStart(2, 0);

	return randomNum;
}

function changeBgColor() {
	// For Muted Colors
	// const first = shuffle([ (Math.floor(Math.random() * 66) + 190).toString(16).padStart(2, 0), 'FF', 'BF' ]);
	// const second = shuffle([ (Math.floor(Math.random() * 66) + 190).toString(16).padStart(2, 0), 'FF', 'BF' ]);
	// var hexcode1 = first[0] + first[1] + first[2];
	// var hexcode2 = second[0] + second[1] + second[2];

	//clipboard.classList.replace('fa-clipboard-check', 'fa-clipboard');
	title.innerHTML = 'PASTEL   <i class="fas fa-clipboard" id="clipboard" aria-hidden="true"></i>';

	var hexX = genRandom();
	var hexY = genRandom();
	var hexZ = genRandom();

	var hexX2 = genRandom();
	var hexY2 = genRandom();
	var hexZ2 = genRandom();

	var hexcode1 = hexX + hexY + hexZ;
	var hexcode2 = hexX2 + hexY2 + hexZ2;

	numberval.innerHTML = '#' + number() + number() + number() + number() + number();

	hex.innerHTML = 'HEX : #' + hexcode1.toUpperCase() + ', #' + hexcode2.toUpperCase();

	// Result Displaying
	document.body.style.background = 'linear-gradient(35deg, #' + hexcode1 + ', #' + hexcode2 + ')';

	exchangeRgb(hexX, hexY, hexZ, hexX2, hexY2, hexZ2);
}

function number() {
	return Math.floor(Math.random() * 10).toString(16);
}

function shuffle(array) {
	let currentIndex = array.length,
		randomIndex;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[ array[currentIndex], array[randomIndex] ] = [ array[randomIndex], array[currentIndex] ];
	}

	return array;
}

// Exchange The Hex Value To RGB Value
function exchangeRgb(x, y, z, x2, y2, z2) {
	var rgbX = parseInt(x, 16);
	var rgbY = parseInt(y, 16);
	var rgbZ = parseInt(z, 16);

	var rgbX2 = parseInt(x2, 16);
	var rgbY2 = parseInt(y2, 16);
	var rgbZ2 = parseInt(z2, 16);

	// Result Displaying
	rgb.innerHTML = 'RGB : (' + rgbX + ', ' + rgbY + ', ' + rgbZ + '), (' + rgbX2 + ', ' + rgbY2 + ', ' + rgbZ2 + ')';

	exchangeHsl(rgbX, rgbY, rgbZ, rgbX2, rgbY2, rgbZ2);
	exchangeCmyk(rgbX, rgbY, rgbZ, rgbX2, rgbY2, rgbZ2);
}

// Exchange The RGB Value To HSL Value
function exchangeHsl(r, g, b, r2, g2, b2) {
	var rgbR = (r /= 255);
	var rgbG = (g /= 255);
	var rgbB = (b /= 255);

	var rgbR2 = (r2 /= 255);
	var rgbG2 = (g2 /= 255);
	var rgbB2 = (b2 /= 255);

	var hue;
	var saturation;
	var lightness;

	var hue2;
	var saturation2;
	var lightness2;

	var rgbMax = Math.max(rgbR, rgbG, rgbB); // Maximum Value Of RGB
	var rgbMin = Math.min(rgbR, rgbG, rgbB); // Minimum Value Of RGB

	var rgbMax2 = Math.max(rgbR2, rgbG2, rgbB2); // Maximum Value Of RGB
	var rgbMin2 = Math.min(rgbR2, rgbG2, rgbB2); // Minimum Value Of RGB

	// Calculate The Lightness Value
	var lightness = Math.round((rgbMin + rgbMax) / 2 * 100);
	var lightness2 = Math.round((rgbMin2 + rgbMax2) / 2 * 100);

	// Calculate The Saturation Value
	if (rgbMax == rgbMin) {
		saturation = 0;
	} else if (lightness < 50) {
		saturation = Math.round((rgbMax - rgbMin) / (rgbMax + rgbMin) * 100);
	} else if (lightness > 50) {
		saturation = Math.round((rgbMax - rgbMin) / (2.0 - rgbMax - rgbMin) * 100);
	} else if (lightness == 50) {
		saturation = Math.round((rgbMax - rgbMin) / (rgbMax + rgbMin) * 100);
	}

	if (rgbMax2 == rgbMin2) {
		saturation2 = 0;
	} else if (lightness2 < 50) {
		saturation2 = Math.round((rgbMax2 - rgbMin2) / (rgbMax2 + rgbMin2) * 100);
	} else if (lightness2 > 50) {
		saturation2 = Math.round((rgbMax2 - rgbMin2) / (2.0 - rgbMax2 - rgbMin2) * 100);
	} else if (lightness2 == 50) {
		saturation2 = Math.round((rgbMax2 - rgbMin2) / (rgbMax2 + rgbMin2) * 100);
	}

	// Calculate The Hue Value
	if (rgbMax == rgbR) {
		hue = (rgbG - rgbB) / (rgbMax - rgbMin);
	} else if (rgbMax == rgbG) {
		hue = 2.0 + (rgbB - rgbR) / (rgbMax - rgbMin);
	} else if (rgbMax == rgbB) {
		hue = 4.0 + (rgbR - rgbG) / (rgbMax - rgbMin);
	}

	hue = Math.round(hue * 60);

	if (hue < 0) {
		hue = hue + 360;
	}

	if (rgbMax2 == rgbR2) {
		hue2 = (rgbG2 - rgbB2) / (rgbMax2 - rgbMin2);
	} else if (rgbMax2 == rgbG2) {
		hue2 = 2.0 + (rgbB2 - rgbR2) / (rgbMax2 - rgbMin2);
	} else if (rgbMax2 == rgbB2) {
		hue2 = 4.0 + (rgbR2 - rgbG2) / (rgbMax2 - rgbMin2);
	}

	hue2 = Math.round(hue2 * 60);

	if (hue2 < 0) {
		hue2 = hue2 + 360;
	}

	// Result Displaying
	hsl.innerHTML =
		'HSL : (' +
		hue +
		'°, ' +
		saturation +
		'%, ' +
		lightness +
		'%)' +
		', (' +
		hue2 +
		'°, ' +
		saturation2 +
		'%, ' +
		lightness2 +
		'%)';

	changeFontColor(lightness);
}

// Exchange The RGB Value To HSL Value
function exchangeCmyk(r, g, b, r2, g2, b2) {
	var rgbR = (r /= 255);
	var rgbG = (g /= 255);
	var rgbB = (b /= 255);

	var rgbR2 = (r2 /= 255);
	var rgbG2 = (g2 /= 255);
	var rgbB2 = (b2 /= 255);

	var K = 1 - Math.max(rgbR, rgbG, rgbB);
	var K2 = 1 - Math.max(rgbR2, rgbG2, rgbB2);

	var C = Math.round((1 - rgbR - K) / (1 - K) * 100);
	var M = Math.round((1 - rgbG - K) / (1 - K) * 100);
	var Y = Math.round((1 - rgbB - K) / (1 - K) * 100);

	var C2 = Math.round((1 - rgbR2 - K2) / (1 - K2) * 100);
	var M2 = Math.round((1 - rgbG2 - K2) / (1 - K2) * 100);
	var Y2 = Math.round((1 - rgbB2 - K2) / (1 - K2) * 100);

	K = Math.round(K * 100);
	K2 = Math.round(K2 * 100);

	// Result Displaying
	cmyk.innerHTML =
		'CMYK : (' +
		C +
		'%, ' +
		M +
		'%, ' +
		Y +
		'%, ' +
		K +
		'%)' +
		', (' +
		C2 +
		'%, ' +
		M2 +
		'%, ' +
		Y2 +
		'%, ' +
		K2 +
		'%)';
}

// Change The Font Color Base on The Nightness of The Background
function changeFontColor(lightness) {
	this.lightness = lightness;

	if (lightness > 50) {
		content.style.color = '#333';
		icon.style.color = '#333';
	} else if (lightness <= 50) {
		content.style.color = '#fff';
		icon.style.color = '#fff';
	}
}
