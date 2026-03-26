/**
 * SDV-style Avatar Compositor
 * Composites character portraits from Jazzybee creator sprite layers.
 * Works at 64x64 native resolution, upscales to 256x256 for display.
 *
 * Key technique: facial feature layers are full-face alpha=255 and would
 * overwrite each other. We only stamp the NON-SKIN detail pixels from each.
 * Hair is split into back (behind face) and front (over forehead).
 */

// Base palette colors in the original sprite layers
const BASE_SKIN = [[136,20,86],[224,85,113],[255,135,110],[255,170,128],[255,197,176],[255,230,202]];
const OUTLINE = [56,0,42];
const IRIS_OLD = [[35,75,37],[30,124,70],[169,235,199],[150,178,255]];
const LIP_OLD = [[142,4,41],[189,57,71],[245,102,96]];
const HAIR_BASE = [[45,33,84],[56,69,141],[51,88,181],[33,118,220],[0,166,238],[49,210,255],[95,247,255]];

// All "detail" colors that should always be visible (not skin fill)
// Includes: outlines, iris, lips, whites, highlights, eyelash colors, eye shadows
const DETAIL_SET = new Set([
  ...[ OUTLINE, ...IRIS_OLD, ...LIP_OLD,
    [252,254,255], [255,157,2],
    // Extra eye colors found in various eye layers
    [129,131,211], [250,246,255], [213,240,255], // eye highlights/shadows
    [81,194,133], [99,0,54], // eyelash variants
    [181,164,203], [81,65,111], [154,139,189], [45,0,33], // elegant/disdain lash
    [249,131,116], // heavy mouth highlight
  ].map(c => c.join(','))
]);
const HAIR_SET = new Set(HAIR_BASE.map(c => c.join(',')));

// Target palettes
const SKIN_TONES = [
  [[65,35,25],[105,65,45],[155,105,75],[195,150,118],[225,195,168],[248,232,215]],
  [[75,45,30],[115,75,50],[165,115,80],[200,158,125],[230,200,172],[250,235,218]],
  [[55,30,20],[90,55,38],[135,90,60],[175,125,92],[210,168,135],[238,210,185]],
  [[45,28,18],[78,48,32],[118,78,52],[158,108,75],[195,148,115],[228,195,168]],
  [[35,20,14],[62,38,25],[98,62,40],[138,92,62],[175,128,95],[210,170,140]],
  [[25,15,10],[48,30,20],[78,50,35],[112,75,52],[150,108,78],[190,148,118]],
];
const HAIR_COLORS = [
  [[15,8,5],[28,15,8],[45,28,15],[65,42,25],[95,65,40],[135,95,62],[178,130,88]],
  [[25,12,8],[42,22,12],[68,38,22],[98,58,35],[138,82,48],[178,112,65],[215,148,88]],
  [[40,28,10],[82,58,22],[128,92,35],[172,132,52],[212,172,75],[238,202,105]],
  [[55,42,15],[102,80,28],[152,125,45],[198,168,65],[232,205,95],[248,228,135]],
  [[32,10,10],[68,18,18],[112,28,28],[162,42,42],[205,68,58],[230,95,78]],
  [[28,8,32],[58,15,68],[95,28,108],[135,45,155],[175,68,195],[208,98,220]],
  [[8,18,38],[15,35,75],[25,55,120],[42,80,165],[62,110,205],[88,140,230]],
  [[8,28,22],[15,55,45],[25,88,72],[42,122,102],[62,160,132],[88,192,162]],
  [[38,12,28],[78,25,55],[125,42,85],[172,62,120],[215,85,152],[240,115,180]],
  [[10,10,12],[22,22,25],[38,38,42],[58,58,62],[82,82,88],[108,108,115]],
  [[52,48,45],[98,92,85],[148,140,132],[195,188,178],[230,225,218],[248,245,242]],
];
const EYE_COLORS = [
  [[15,40,95],[30,70,140],[65,125,200],[145,190,235]],
  [[25,70,30],[40,110,50],[80,170,100],[150,220,170]],
  [[60,30,10],[100,55,25],[150,90,45],[200,155,100]],
  [[50,20,70],[80,35,115],[130,70,175],[185,140,220]],
  [[70,45,15],[115,75,25],[165,120,50],[210,175,100]],
  [[25,60,60],[40,100,100],[75,155,155],[145,210,210]],
];
const LIP_COLORS = [
  [[85,28,32],[155,50,55],[210,85,80]],
  [[120,40,50],[180,65,75],[220,100,100]],
  [[80,25,30],[140,48,52],[185,72,68]],
  [[100,35,55],[160,58,80],[205,88,108]],
];
const BG_COLORS = [[200,175,140],[190,170,150],[185,168,148],[198,182,158],[192,178,162]];

// Layer options (filenames in /sprites/)
const FACES = ['oval.png','round.png','sharpheart.png','bluntheart.png','diamond.png','sharptriangle.png','rect.png','pointoval.png','longpoint.png','blunttriablge.png'];
const EYES = ['almond.png','neutral.png','elegant.png','droopy.png','startled.png','small2.png','roundlookaway.png','droopyhood.png','disdain.png']; // removed small.png (zero detail)
const BROWS = ['shortstraight.png','thinstraight.png','thickstraight.png','shortthin.png','thickdownturned.png','thinangry.png','shortangry.png','thickangry.png'];
const NOSES = ['button.png','dainty.png','upturned.png','slightdefined.png','defined.png','greek.png','roman.png','buttonbridge.png','definedbridge.png'];
const MOUTHS = ['smilelight.png','smileheavy.png','neutrallight.png','neutralheavy.png','uncertainlight.png']; // removed *no.png variants (zero detail - pure skin shading)
const HAIRS_FEM = ['wavylong.png','longstraight.png','longstraightvol.png','wavybob.png','straightbob.png','braids.png','pigtails.png','bun.png','lowbun.png','widebun.png','curlybob.png','curlyhalfup.png','curlybun.png','curlyspacebuns.png','spacebuns.png','spacebunstwin.png','longpony.png','midlengthpony.png','sideswept.png','faceframe.png','longmidpart.png','curtainbangs.png','pixie.png','longdread.png','wisps.png','dreadsbun.png','pulledback.png','afro1.png','afro2.png','shortdreads.png'];
const HAIRS_MASC = ['buzz.png','spiky.png','slickedback.png','slickedspiky.png','shortshaved.png','crewshaved.png','curlyshaved.png','tallspikes.png','shortmessy.png','shortneat.png','shortmess.png','midchoppy.png'];
const HAIRS = [...HAIRS_FEM, ...HAIRS_MASC];
const BANGS = ['straight1.png','straight2.png','side1.png','side2.png','swoopy.png','sideparttucked.png','curlyside1.png','curlyside2.png','curlymidpart.png','curlysideleft.png','wavymid.png','widowspeak.png','messyspiky.png','shortdangly.png','sidesweptleft.png','curledback.png','slickedbacklong.png','shortdisheveled.png','midshortmess.png','shortslightmess.png','shortneat.png','quailfeather.png'];
const TOPS_FEM = ['frill.png','roundneck.png','shoulderfree.png','tanktop.png','widecut.png','asymmetrical.png','fancy.png','cutetop.png','spagetti.png','ruffletop.png','strapless.png','neckholder.png','widevneck.png','ruffletop2.png','princesstop.png','sari.png','widecut2.png','nosleeves.png'];
const TOPS_NEUTRAL = ['crewneck.png','vneck.png','turtleneck.png','striped.png','collarstand.png','uniform.png','tallcollar.png','shirtsweater.png','sweater.png','shirtbow.png','shirttie.png','tatter.png','jumpsuit.png','robe.png'];
const TOPS = [...TOPS_FEM, ...TOPS_NEUTRAL];
const SLEEVES = ['regsleeves.png','puffysleeves.png','elegantsleeves.png','fancysleeves.png','lowsleeves.png','squaresleeves.png','maxruffles.png','rippedsleeves.png'];
const OVERS = [null,null,null,null,null,null,null,null,'cardigan.png','hoodie.png','jacket.png','vest.png','scarf.png','overalls1.png','overalls2.png','suspenders.png','cape.png','neckkerchief.png','openshirt.png','suitjacket.png','winterjacket1.png','winterjacket2.png','uniformjacket.png','ruffles.png','sweatervest.png','apron.png','bowtie.png'];
const HATS = [null,null,null,null,null,null,null,null,null,null,'bow.png','flower.png','ribbon.png','headband.png','star.png','flower_crown.png','cat_ears.png','rose.png','bigbow.png','narrowheadband.png','wideheadband.png','tiara.png','crown.png','beanie.png','cap.png','newsboy.png','straw.png','sun.png','cowboy.png','bandana.png','witchhat.png','witchhat2.png','top.png','bowler.png','horns.png','watermelonband.png','tropiclip.png','exotic_flower.png'];
const EAR_ACC = [null,null,null,null,null,null,'danglyear.png','hoopear.png','studear.png','silvereardangle.png','silverearstud.png','goldeardangle.png','goldearstud.png','flowerear.png','bobblear.png','thickdanglyear.png','earring8.png'];
const NECK_ACC = [null,null,null,null,null,null,null,null,'chainnecklace.png','beadnecklace.png','beadnecklace2.png','choker.png','silverchoker.png','goldchoker.png','doublechain.png'];
const GLASSES = [null,null,null,null,null,null,null,null,null,null,'glassesbottom.png','glassesround.png','glassesroundedrect.png','glassestop.png','glassesrectangle.png'];
const HAIR_EXT = [null,null,null,null,null,null,'hairext1.png','hairext2.png','hairext3.png','hairext4.png','hairext5.png'];
const FACE_ACC = [null,null,null,null,null,'blush.png','freckles.png','lightfreckles.png','beautymark1.png','beautymark2.png','beautymark3.png','eyebags.png'];
const FACE_MARKS = [null,null,null,null,null,null,null,null,'nosepierce.png','lippiercing.png','elfears.png','mermaid.png'];
const FACIAL_HAIR = [null,null,null,null,null,'goatee.png','goatee_2.png','mustache.png','fullbeard.png','chincurtain.png','chin_bit.png','sideburn.png','goatee_sideburn.png','mustache_sideburn.png'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function colKey(r, g, b) { return r + ',' + g + ',' + b; }
function colEq(a, b) { return a[0]===b[0] && a[1]===b[1] && a[2]===b[2]; }
function colDist2(a, b) { return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2; }

function recolorPixel(r, g, b, skin, hair, eye, lip, isHair) {
  // Check outline
  if (r===OUTLINE[0] && g===OUTLINE[1] && b===OUTLINE[2]) return hair[0];
  // Check iris
  for (let i = 0; i < IRIS_OLD.length; i++)
    if (r===IRIS_OLD[i][0] && g===IRIS_OLD[i][1] && b===IRIS_OLD[i][2])
      return eye[Math.min(i, eye.length-1)];
  // Check lips
  for (let i = 0; i < LIP_OLD.length; i++)
    if (r===LIP_OLD[i][0] && g===LIP_OLD[i][1] && b===LIP_OLD[i][2])
      return lip[Math.min(i, lip.length-1)];
  // Check white/highlight
  if (r===252 && g===254 && b===255) return [248,245,240];
  if (r===255 && g===157 && b===2) return [220,140,90];
  // Check hair-specific colors
  const hk = colKey(r,g,b);
  if (HAIR_SET.has(hk)) {
    const idx = HAIR_BASE.findIndex(c => c[0]===r && c[1]===g && c[2]===b);
    return hair[Math.min(idx, hair.length-1)];
  }
  // Check skin palette (nearest match)
  let bestI = 0, bestD = 999999;
  for (let i = 0; i < BASE_SKIN.length; i++) {
    const d = colDist2([r,g,b], BASE_SKIN[i]);
    if (d < bestD) { bestD = d; bestI = i; }
  }
  if (bestD < 5000) {
    const pal = isHair ? hair : skin;
    return pal[Math.min(bestI, pal.length-1)];
  }
  return [r, g, b];
}

function isDetailPixel(r, g, b) {
  return DETAIL_SET.has(colKey(r, g, b));
}

// Image loading cache
const imageCache = {};
function loadImage(name) {
  return new Promise((resolve) => {
    if (imageCache[name]) { resolve(imageCache[name]); return; }
    const img = new Image();
    img.onload = () => { imageCache[name] = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = '/sprites/' + name;
  });
}

function getPixels(img) {
  // Draw at 256x256 then read, downscale in pixel data to 64x64
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, 64, 64);
  return ctx.getImageData(0, 0, 64, 64);
}

async function generateAvatar() {
  const skin = pick(SKIN_TONES);
  const hair = pick(HAIR_COLORS);
  const eye = pick(EYE_COLORS);
  const lip = pick(LIP_COLORS);
  const bg = pick(BG_COLORS);

  // Output canvas at 64x64
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Fill background
  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  ctx.fillRect(0, 0, 64, 64);

  const faceName = pick(FACES);
  const faceImg = await loadImage(faceName);

  // Helper: recolor an image's pixel data
  function recolorData(imgData, isHair) {
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] === 0) continue;
      const nc = recolorPixel(d[i], d[i+1], d[i+2], skin, hair, eye, lip, isHair);
      d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2];
    }
    return imgData;
  }

  // Helper: recolor hair layer but keep skin pixels as SKIN (not hair)
  // Only recolor actual hair-colored pixels to target hair, skin stays skin
  function recolorHairSmart(imgData) {
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] === 0) continue;
      const r = d[i], g = d[i+1], b = d[i+2];
      const hk = colKey(r,g,b);
      // Hair-specific colors -> target hair palette
      if (HAIR_SET.has(hk)) {
        const idx = HAIR_BASE.findIndex(c => c[0]===r && c[1]===g && c[2]===b);
        const nc = hair[Math.min(idx, hair.length-1)];
        d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2];
      } else if (r===OUTLINE[0] && g===OUTLINE[1] && b===OUTLINE[2]) {
        // Outline -> darkest hair
        d[i] = hair[0][0]; d[i+1] = hair[0][1]; d[i+2] = hair[0][2];
      } else {
        // Skin pixels -> recolor as SKIN (not hair!)
        const nc = recolorPixel(r, g, b, skin, hair, eye, lip, false);
        d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2];
      }
    }
    return imgData;
  }


  // Helper: put imagedata onto canvas
  function stamp(imgData) {
    const tmp = document.createElement('canvas');
    tmp.width = 64; tmp.height = 64;
    tmp.getContext('2d').putImageData(imgData, 0, 0);
    ctx.drawImage(tmp, 0, 0);
  }

  // Helper: stamp only NON-SKIN pixels (anything not in BASE_SKIN palette)
  function stampNonSkin(imgData) {
    const nonSkin = new ImageData(64, 64);
    const d = imgData.data;
    const skinSet = new Set(BASE_SKIN.map(c => c.join(',')));
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        if (d[i+3] === 0) continue;
        const key = d[i] + ',' + d[i+1] + ',' + d[i+2];
        if (!skinSet.has(key)) {
          nonSkin.data[i] = d[i]; nonSkin.data[i+1] = d[i+1];
          nonSkin.data[i+2] = d[i+2]; nonSkin.data[i+3] = 255;
        }
      }
    stamp(nonSkin);
  }

  // Helper: stamp pixels where a layer uses a DIFFERENT skin shade than the face
  // Used for noses and other pure-skin-shading features
  function stampShadeDiffs(layerData) {
    if (!faceImg) return;
    const faceData = getPixels(faceImg);
    const diff = new ImageData(64, 64);
    const ld = layerData.data;
    const fd = faceData.data;
    const skinSet = BASE_SKIN.map(c => c.join(','));
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y*64+x)*4;
        if (ld[i+3] === 0 || fd[i+3] === 0) continue;
        const lk = ld[i]+','+ld[i+1]+','+ld[i+2];
        const fk = fd[i]+','+fd[i+1]+','+fd[i+2];
        // Both must be skin colors, but different shades
        if (lk !== fk && skinSet.includes(lk) && skinSet.includes(fk)) {
          // Recolor the layer's shade to target skin
          const nc = recolorPixel(ld[i], ld[i+1], ld[i+2], skin, hair, eye, lip, false);
          diff.data[i] = nc[0]; diff.data[i+1] = nc[1];
          diff.data[i+2] = nc[2]; diff.data[i+3] = 255;
        }
      }
    stamp(diff);
  }

  // Helper: stamp ONLY detail pixels from imgData
  function stampDetails(imgData, isHair) {
    const detail = new ImageData(64, 64);
    const d = imgData.data;
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        if (d[i+3] === 0) continue;
        if (isDetailPixel(d[i], d[i+1], d[i+2])) {
          const nc = recolorPixel(d[i], d[i+1], d[i+2], skin, hair, eye, lip, isHair);
          const di = i;
          detail.data[di] = nc[0]; detail.data[di+1] = nc[1];
          detail.data[di+2] = nc[2]; detail.data[di+3] = 255;
        }
      }
    stamp(detail);
  }

  // Pre-load hair layers
  const hairName = pick(HAIRS);
  const bangName = pick(BANGS);
  const isMascHair = HAIRS_MASC.includes(hairName);

  // === COMPOSITING ORDER ===

  // 1. Face shape (recolored skin) - goes first as base
  if (faceImg) {
    const fd = recolorData(getPixels(faceImg), false);
    stamp(fd);
  }

  // 3. Facial features - stamp only detail pixels
  const noseName = pick(NOSES);
  const features = [
    [pick(EYES), false], [pick(BROWS), true], [noseName, false], [pick(MOUTHS), false]
  ];
  const faceAcc = pick(FACE_ACC);
  if (faceAcc) features.push([faceAcc, false]);
  const faceMark = pick(FACE_MARKS);
  if (faceMark) features.push([faceMark, false]);

  for (const [name, isH] of features) {
    const img = await loadImage(name);
    if (img) stampDetails(getPixels(img), isH);
  }
  // Nose is pure skin shading - stamp shade differences
  const noseImg = await loadImage(noseName);
  if (noseImg) stampShadeDiffs(getPixels(noseImg));

  // 3b. Facial hair - only with masculine hairstyles, recolor to match hair
  const beardName = isMascHair ? pick(FACIAL_HAIR) : null;
  if (beardName) {
    const img = await loadImage(beardName);
    if (img) {
      // Recolor beard with hair color then stamp only non-skin pixels
      const bd = recolorHairZoned(getPixels(img));
      stampNonSkin(bd);
    }
  }

  // 4. Clothing (drawn before hair, will re-stamp after)
  const topName = isMascHair ? pick(TOPS_NEUTRAL) : pick([...TOPS_FEM, ...TOPS_NEUTRAL]);
  const slName = pick(SLEEVES);
  const ovName = pick(OVERS);
  const topImg = await loadImage(topName);
  if (topImg) { ctx.drawImage(topImg, 0, 0, 64, 64); }
  const slImg = await loadImage(slName);
  if (slImg) { ctx.drawImage(slImg, 0, 0, 64, 64); }
  if (ovName) { const img = await loadImage(ovName); if (img) ctx.drawImage(img, 0, 0, 64, 64); }

  // 5. Hair - paint a hair-color fill ONLY where hair/bang layers have pixels
  // This follows the natural hair shape instead of a hard rectangle
  {
    const hairMid = hair[Math.floor(hair.length / 2)];
    const hairDark = hair[Math.max(0, Math.floor(hair.length / 2) - 1)];
    const hairFill = new ImageData(64, 64);
    // Get hair and bang pixel coverage
    const hImg = await loadImage(hairName);
    const bImg = await loadImage(bangName);
    const hPixels = hImg ? getPixels(hImg) : null;
    const bPixels = bImg ? getPixels(bImg) : null;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        const hairHere = (hPixels && hPixels.data[i+3] > 0) || (bPixels && bPixels.data[i+3] > 0);
        if (hairHere) {
          // Use darker shade at edges, mid-tone in center for depth
          const c = (y < 10) ? hairDark : hairMid;
          hairFill.data[i] = c[0];
          hairFill.data[i+1] = c[1];
          hairFill.data[i+2] = c[2];
          hairFill.data[i+3] = 255;
        }
      }
    }
    stamp(hairFill);
  }
  // Smart hair recolor: skin pixels become hair-colored ONLY where
  // surrounded by actual hair-colored pixels (scalp between strands).
  // Isolated skin pixels (exposed face) stay as skin.
  function recolorHairZoned(imgData) {
    const d = imgData.data;
    // First pass: find where actual hair-colored pixels are
    const isHairPx = new Uint8Array(64 * 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        if (d[i+3] === 0) continue;
        const hk = colKey(d[i], d[i+1], d[i+2]);
        if (HAIR_SET.has(hk) || (d[i]===OUTLINE[0] && d[i+1]===OUTLINE[1] && d[i+2]===OUTLINE[2])) {
          isHairPx[y * 64 + x] = 1;
        }
      }
    // Build a "hair density" map - how many hair pixels within 3px radius
    const hairDensity = new Uint8Array(64 * 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        let count = 0;
        for (let dy = -3; dy <= 3; dy++)
          for (let dx = -3; dx <= 3; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < 64 && nx >= 0 && nx < 64)
              count += isHairPx[ny * 64 + nx];
          }
        hairDensity[y * 64 + x] = count;
      }
    // Second pass: recolor
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        if (d[i+3] === 0) continue;
        const r = d[i], g = d[i+1], b = d[i+2];
        const hk = colKey(r, g, b);
        if (HAIR_SET.has(hk)) {
          const idx = HAIR_BASE.findIndex(c => c[0]===r && c[1]===g && c[2]===b);
          const nc = hair[Math.min(idx, hair.length-1)];
          d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2];
        } else if (r===OUTLINE[0] && g===OUTLINE[1] && b===OUTLINE[2]) {
          d[i] = hair[0][0]; d[i+1] = hair[0][1]; d[i+2] = hair[0][2];
        } else {
          // Skin pixel: if surrounded by lots of hair, make it hair (scalp)
          // If sparse hair nearby, keep as skin (exposed face)
          const density = hairDensity[y * 64 + x];
          const makeHair = density >= 10; // need 10+ hair pixels in 7x7 area
          const nc = recolorPixel(r, g, b, skin, hair, eye, lip, makeHair);
          d[i] = nc[0]; d[i+1] = nc[1]; d[i+2] = nc[2];
        }
      }
    }
    return imgData;
  }
  const hairImg2 = await loadImage(hairName);
  if (hairImg2) { stamp(recolorHairZoned(getPixels(hairImg2))); }
  const bangImg2 = await loadImage(bangName);
  if (bangImg2) { stamp(recolorHairZoned(getPixels(bangImg2))); }

  // Hair extension
  const he = pick(HAIR_EXT);
  if (he) {
    const img = await loadImage(he);
    if (img) { stamp(recolorHairZoned(getPixels(img))); }
  }

  // 6. Hat (zoned recolor)
  const hat = pick(HATS);
  if (hat) {
    const img = await loadImage(hat);
    if (img) { stamp(recolorHairZoned(getPixels(img))); }
  }

  // 7. Glasses - stamp only non-skin pixels (frames, lenses) to avoid wiping hair
  const gl = pick(GLASSES);
  if (gl) {
    const img = await loadImage(gl);
    if (img) stampNonSkin(getPixels(img));
  }

  // 8. Ear/neck accessories - stamp only non-skin pixels
  const ea = pick(EAR_ACC);
  if (ea) { const img = await loadImage(ea); if (img) stampNonSkin(getPixels(img)); }
  const na = pick(NECK_ACC);
  if (na) { const img = await loadImage(na); if (img) stampNonSkin(getPixels(img)); }

  // 9. Re-stamp clothing non-skin pixels (shirts/sleeves got covered by hair)
  if (topImg) stampNonSkin(getPixels(topImg));
  if (slImg) stampNonSkin(getPixels(slImg));
  if (ovName) { const img = await loadImage(ovName); if (img) stampNonSkin(getPixels(img)); }

  // 10. Re-stamp beard FIRST (so eyes go on top of it)
  if (beardName) {
    const img = await loadImage(beardName);
    if (img) {
      const bd = recolorHairZoned(getPixels(img));
      stampNonSkin(bd);
    }
  }
  // 11. RE-STAMP all facial details on top (eyes/brows/mouth ALWAYS visible)
  for (const [name, isH] of features) {
    const img = await loadImage(name);
    if (img) stampDetails(getPixels(img), isH);
  }
  // Re-stamp nose shade diffs
  if (noseImg) stampShadeDiffs(getPixels(noseImg));

  // Upscale to 256x256
  const output = document.createElement('canvas');
  output.width = 256; output.height = 256;
  const octx = output.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(canvas, 0, 0, 256, 256);

  return output.toDataURL('image/png');
}

// Generate N avatars and return array of data URLs
async function generateAvatars(count) {
  const avatars = [];
  for (let i = 0; i < count; i++) {
    avatars.push(await generateAvatar());
  }
  return avatars;
}
