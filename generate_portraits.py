#!/usr/bin/env python3
"""Generate random SDV-style portraits from Jazzybee creator sprite layers.
Key insight: feature layers (eyes, brows, nose, mouth) are full-face alpha=255 layers
that would overwrite each other. We only stamp the NON-SKIN detail pixels from each."""
from PIL import Image
import numpy as np
import os, random

SRC = "/tmp/sdv-assets"
OUT = "/Users/warrenjthompson/Source/spinner-sync/public/portraits"
os.makedirs(OUT, exist_ok=True)
random.seed(42)

# Base palette in the sprite layers
BASE_SKIN = [(136,20,86),(224,85,113),(255,135,110),(255,170,128),(255,197,176),(255,230,202)]
BASE_SKIN_SET = set(BASE_SKIN)
OUTLINE = (56,0,42)
IRIS_OLD = [(35,75,37),(30,124,70),(169,235,199),(150,178,255)]
LIP_OLD = [(142,4,41),(189,57,71),(245,102,96)]
DETAIL_COLORS = {OUTLINE} | set(IRIS_OLD) | set(LIP_OLD) | {(252,254,255),(255,157,2)}

# Hair-specific colors (sorted dark to light by luminance)
HAIR_BASE = [(45,33,84),(56,69,141),(51,88,181),(33,118,220),(0,166,238),(49,210,255),(95,247,255)]
HAIR_BASE_SET = set(HAIR_BASE)

# Target palettes
SKIN_TONES = [
    [(65,35,25),(105,65,45),(155,105,75),(195,150,118),(225,195,168),(248,232,215)],
    [(75,45,30),(115,75,50),(165,115,80),(200,158,125),(230,200,172),(250,235,218)],
    [(55,30,20),(90,55,38),(135,90,60),(175,125,92),(210,168,135),(238,210,185)],
    [(45,28,18),(78,48,32),(118,78,52),(158,108,75),(195,148,115),(228,195,168)],
    [(35,20,14),(62,38,25),(98,62,40),(138,92,62),(175,128,95),(210,170,140)],
    [(25,15,10),(48,30,20),(78,50,35),(112,75,52),(150,108,78),(190,148,118)],
]
HAIR_COLORS = [
    [(15,8,5),(28,15,8),(45,28,15),(65,42,25),(95,65,40),(135,95,62),(178,130,88)],
    [(25,12,8),(42,22,12),(68,38,22),(98,58,35),(138,82,48),(178,112,65),(215,148,88)],
    [(40,28,10),(62,48,18),(92,72,28),(128,102,42),(168,138,58),(208,178,80),(238,208,112)],
    [(55,42,15),(82,65,25),(115,95,38),(155,130,52),(195,170,72),(228,205,98),(248,232,138)],
    [(32,10,10),(52,15,15),(82,22,22),(118,32,32),(158,48,42),(200,72,58),(232,100,80)],
    [(28,8,32),(45,12,55),(68,22,82),(98,35,118),(135,52,158),(178,75,200),(215,105,228)],
    [(8,18,38),(12,28,62),(18,42,95),(28,62,135),(42,88,175),(62,118,212),(88,152,238)],
    [(8,28,22),(12,42,38),(18,62,55),(28,88,78),(42,118,105),(62,155,138),(88,195,172)],
    [(38,12,28),(58,22,45),(85,35,68),(118,52,95),(158,72,128),(198,98,165),(232,128,198)],
    [(10,10,12),(18,18,20),(28,28,32),(42,42,48),(62,62,68),(85,85,92),(112,112,120)],
    [(52,48,45),(78,72,68),(112,105,98),(152,145,138),(195,190,182),(228,224,218),(248,245,242)],
]
EYE_COLORS = [
    [(15,40,95),(30,70,140),(65,125,200),(145,190,235)],
    [(25,70,30),(40,110,50),(80,170,100),(150,220,170)],
    [(60,30,10),(100,55,25),(150,90,45),(200,155,100)],
    [(50,20,70),(80,35,115),(130,70,175),(185,140,220)],
    [(70,45,15),(115,75,25),(165,120,50),(210,175,100)],
    [(25,60,60),(40,100,100),(75,155,155),(145,210,210)],
]
LIP_COLORS = [
    [(85,28,32),(155,50,55),(210,85,80)],
    [(120,40,50),(180,65,75),(220,100,100)],
    [(80,25,30),(140,48,52),(185,72,68)],
    [(100,35,55),(160,58,80),(205,88,108)],
]
BG_COLORS = [(200,175,140),(190,170,150),(185,168,148),(198,182,158),(192,178,162)]

def is_detail(c):
    c = (int(c[0]),int(c[1]),int(c[2]))
    return c in DETAIL_COLORS or c in HAIR_BASE_SET

def recolor_pixel(c, skin, hair, eye, lip, is_hair=False):
    c = (int(c[0]),int(c[1]),int(c[2]))
    if c == OUTLINE: return hair[0]
    for i, old in enumerate(IRIS_OLD):
        if c == old: return eye[min(i,3)]
    for i, old in enumerate(LIP_OLD):
        if c == old: return lip[min(i,2)]
    if c == (252,254,255): return (248,245,240)
    if c == (255,157,2): return (220,140,90)
    # Check hair-specific colors (the blue/purple strand colors)
    if c in HAIR_BASE_SET:
        idx = HAIR_BASE.index(c)
        return hair[min(idx, len(hair)-1)]
    # Check skin palette
    best_i, best_d = 0, 999999
    for i, old in enumerate(BASE_SKIN):
        d = (c[0]-old[0])**2 + (c[1]-old[1])**2 + (c[2]-old[2])**2
        if d < best_d: best_d, best_i = d, i
    if best_d < 5000:
        pal = hair if is_hair else skin
        return pal[min(best_i, len(pal)-1)]
    return c

def load64(name):
    path = os.path.join(SRC, name)
    if not os.path.exists(path): return None
    img = Image.open(path).convert('RGBA')
    if img.size == (256,256): img = img.resize((64,64), Image.NEAREST)
    if img.size != (64,64): return None
    return np.array(img)

def existing(name):
    return os.path.exists(os.path.join(SRC, name))

def pick_existing(lst):
    valid = [x for x in lst if x is None or existing(x)]
    return random.choice(valid) if valid else None

# Available layers
FACES = [f for f in ['oval.png','round.png','sharpheart.png','bluntheart.png','diamond.png',
         'sharptriangle.png','rect.png','pointoval.png','longpoint.png','blunttriablge.png'] if existing(f)]
EYES = [f for f in ['almond.png','neutral.png','elegant.png','droopy.png','startled.png',
        'small.png','small2.png','roundlookaway.png','droopyhood.png','disdain.png'] if existing(f)]
BROWS = [f for f in ['shortstraight.png','thinstraight.png','thickstraight.png','shortthin.png',
         'thickdownturned.png','thinangry.png','shortangry.png','thickangry.png'] if existing(f)]
NOSES = [f for f in ['button.png','dainty.png','upturned.png','slightdefined.png','defined.png',
         'greek.png','roman.png','buttonbridge.png','definedbridge.png','short.png','small.png'] if existing(f)]
MOUTHS = [f for f in ['smilelight.png','smileheavy.png','smileno.png','smirkno.png','neutrallight.png',
          'neutralheavy.png','neutralno.png','poutyno.png','sillypout.png','uncertainlight.png','twosmileno.png'] if existing(f)]
HAIRS = [f for f in ['wavylong.png','longstraight.png','longstraightvol.png','wavybob.png','straightbob.png',
         'braids.png','pigtails.png','bun.png','lowbun.png','widebun.png','curlybob.png',
         'curlyhalfup.png','curlybun.png','curlyspacebuns.png','spacebuns.png','spacebunstwin.png',
         'longpony.png','midlengthpony.png','sideswept.png','faceframe.png','longmidpart.png',
         'curtainbangs.png','pixie.png','afro1.png','afro2.png','shortmessy.png','shortneat.png',
         'midchoppy.png','pulledback.png','longdread.png','shortdreads.png','wisps.png',
         'thin%20straight.png','small%20pony.png','small%20low%20pony.png','curlyside2.png',
         'curlyshaved.png','dreadsbun.png','slickedspiky.png','slickedback.png','tallspikes.png',
         'spiky.png','shortshaved.png','crewshaved.png','buzz.png'] if existing(f)]
BANGS = [f for f in ['straight1.png','straight2.png','side1.png','side2.png','swoopy.png',
         'sideparttucked.png','curlyside1.png','curlyside2.png','curlymidpart.png',
         'curlysideleft.png','wavymid.png','widowspeak.png','messyspiky.png','shortdangly.png',
         'sidesweptleft.png','curledback.png','slickedbacklong.png','shortdisheveled.png',
         'midshortmess.png','shortslightmess.png','shortneat.png'] if existing(f)]
TOPS = [f for f in ['crewneck.png','vneck.png','turtleneck.png','frill.png','roundneck.png',
        'shoulderfree.png','tanktop.png','widecut.png','asymmetrical.png','fancy.png',
        'cutetop.png','spagetti.png','ruffletop.png','strapless.png','neckholder.png',
        'widevneck.png','ruffletop2.png','princesstop.png','striped.png','sari.png',
        'widecut2.png','nosleeves.png','collarstand.png','uniform.png','tallcollar.png',
        'shirtsweater.png','sweater.png','shirtbow.png','shirttie.png','tatter.png',
        'jumpsuit.png','robe.png'] if existing(f)]
SLEEVES = [f for f in ['regsleeves.png','puffysleeves.png','elegantsleeves.png','fancysleeves.png',
           'lowsleeves.png','squaresleeves.png','maxruffles.png','rippedsleeves.png'] if existing(f)]
OVERS = [None]*8 + [f for f in ['cardigan.png','hoodie.png','jacket.png','vest.png','scarf.png',
         'overalls1.png','overalls2.png','suspenders.png','cape.png','neckkerchief.png',
         'openshirt.png','suitjacket.png','winterjacket1.png','winterjacket2.png',
         'uniformjacket.png','ruffles.png','sweatervest.png','apron.png','bowtie.png','collar.png'] if existing(f)]
FACE_ACC = [None]*5 + [f for f in ['blush.png','freckles.png','lightfreckles.png',
            'beautymark1.png','beautymark2.png','beautymark3.png','eyebags.png',
            'cheekscar.png','eyescar.png','nosescar.png','smalleyescar.png','bodyscars.png'] if existing(f)]
HATS = [None]*10 + [f for f in ['bow.png','flower.png','ribbon.png','headband.png','star.png',
        'flower%20crown.png','cat%20ears.png','rose.png','bigbow.png','narrowheadband.png',
        'wideheadband.png','tiara.png','crown.png','beanie.png','cap.png','newsboy.png',
        'straw.png','sun.png','cowboy.png','beach%20hat.png','beach%20hat%202.png',
        'winter%20hat.png','knitted%20cap.png','bandana.png','witchhat.png','witchhat2.png',
        'top.png','bowler.png','pirate%20hat.png','pirate%20hat%201.png','tricorn.png',
        'viking%20hat.png','horns.png','watermelonband.png','tropiclip.png',
        'exotic%20flower.png','goggles%20on%20head.png','sunglasses%20on%20head.png',
        'ear%20muffs.png'] if existing(f)]
EAR_ACC = [None]*6 + [f for f in ['danglyear.png','hoopear.png','studear.png','silvereardangle.png',
           'silverearstud.png','goldeardangle.png','goldearstud.png','flowerear.png','bobblear.png',
           'thickdanglyear.png','multipleear.png','cartilage.png','earring8.png'] if existing(f)]
NECK_ACC = [None]*8 + [f for f in ['chainnecklace.png','beadnecklace.png','beadnecklace2.png',
            'choker.png','silverchoker.png','goldchoker.png','doublechain.png'] if existing(f)]
GLASSES = [None]*10 + [f for f in ['glassesbottom.png','glassesround.png','glassesroundedrect.png',
           'glassestop.png','glassesrectangle.png'] if existing(f)]
HAIR_EXT = [None]*6 + [f for f in ['hairext1.png','hairext2.png','hairext3.png','hairext4.png','hairext5.png'] if existing(f)]
FACE_MARKS = [None]*8 + [f for f in ['nosepierce.png','lippiercing.png','elfears.png',
              'mermaid.png','duck%20beak.png'] if existing(f)]

# Clear old
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))

for i in range(40):
    skin = random.choice(SKIN_TONES)
    hair = random.choice(HAIR_COLORS)
    eye = random.choice(EYE_COLORS)
    lip = random.choice(LIP_COLORS)
    bg = random.choice(BG_COLORS)

    comp = Image.new('RGBA', (64,64), bg+(255,))

    # 1. Face shape - full recolor
    face_name = random.choice(FACES)
    face_arr = load64(face_name)
    if face_arr is not None:
        rc = face_arr.copy()
        for y in range(64):
            for x in range(64):
                if rc[y,x,3] > 0:
                    rc[y,x,:3] = recolor_pixel(rc[y,x,:3], skin, hair, eye, lip)
        comp = Image.alpha_composite(comp, Image.fromarray(rc))

    # 2. Facial features - ONLY stamp detail (non-skin) pixels
    features = [
        (random.choice(EYES), False),
        (random.choice(BROWS), True),  # brows use hair color
        (random.choice(NOSES), False),
        (random.choice(MOUTHS), False),
    ]
    fa = pick_existing(FACE_ACC)
    if fa: features.append((fa, False))
    fm = pick_existing(FACE_MARKS)
    if fm: features.append((fm, False))

    for feat_name, is_h in features:
        arr = load64(feat_name)
        if arr is None: continue
        stamp = np.zeros((64,64,4), dtype=np.uint8)
        for y in range(64):
            for x in range(64):
                if arr[y,x,3] > 0 and is_detail(arr[y,x,:3]):
                    stamp[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_h)
                    stamp[y,x,3] = 255
        comp = Image.alpha_composite(comp, Image.fromarray(stamp))

    # 3. Clothing (raw - already colored)
    top = random.choice(TOPS)
    arr = load64(top)
    if arr is not None: comp = Image.alpha_composite(comp, Image.fromarray(arr))
    sl = random.choice(SLEEVES)
    arr = load64(sl)
    if arr is not None: comp = Image.alpha_composite(comp, Image.fromarray(arr))
    ov = pick_existing(OVERS)
    if ov:
        arr = load64(ov)
        if arr is not None: comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 4. Hair - full recolor to hair color
    h_name = random.choice(HAIRS)
    arr = load64(h_name)
    if arr is not None:
        for y in range(64):
            for x in range(64):
                if arr[y,x,3] > 0:
                    arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_hair=True)
        comp = Image.alpha_composite(comp, Image.fromarray(arr))

    b_name = random.choice(BANGS)
    arr = load64(b_name)
    if arr is not None:
        for y in range(64):
            for x in range(64):
                if arr[y,x,3] > 0:
                    arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_hair=True)
        comp = Image.alpha_composite(comp, Image.fromarray(arr))

    he = pick_existing(HAIR_EXT)
    if he:
        arr = load64(he)
        if arr is not None:
            for y in range(64):
                for x in range(64):
                    if arr[y,x,3] > 0:
                        arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_hair=True)
            comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 5. Hat (recolor hair-colored pixels)
    ht = pick_existing(HATS)
    if ht:
        arr = load64(ht)
        if arr is not None:
            for y in range(64):
                for x in range(64):
                    if arr[y,x,3] > 0:
                        arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_hair=True)
            comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 6. Glasses (recolor)
    gl = pick_existing(GLASSES)
    if gl:
        arr = load64(gl)
        if arr is not None:
            for y in range(64):
                for x in range(64):
                    if arr[y,x,3] > 0:
                        arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip)
            comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 7. Ear accessories (recolor)
    ea = pick_existing(EAR_ACC)
    if ea:
        arr = load64(ea)
        if arr is not None:
            for y in range(64):
                for x in range(64):
                    if arr[y,x,3] > 0:
                        arr[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip)
            comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 8. Neck accessories (raw)
    na = pick_existing(NECK_ACC)
    if na:
        arr = load64(na)
        if arr is not None: comp = Image.alpha_composite(comp, Image.fromarray(arr))

    # 9. Re-stamp facial feature detail pixels ON TOP of everything
    # (The feature layers' detail pixels got covered by hair/clothing layers)
    # We re-apply ONLY the non-skin detail pixels from each feature
    for feat_name, is_h in features:
        arr = load64(feat_name)
        if arr is None: continue
        stamp = np.zeros((64,64,4), dtype=np.uint8)
        for y in range(64):
            for x in range(64):
                if arr[y,x,3] > 0:
                    c = (int(arr[y,x,0]),int(arr[y,x,1]),int(arr[y,x,2]))
                    if c in DETAIL_COLORS:  # only true detail (outline, iris, lip) - NOT hair
                        stamp[y,x,:3] = recolor_pixel(arr[y,x,:3], skin, hair, eye, lip, is_h)
                        stamp[y,x,3] = 255
        # Only stamp pixels that aren't covered by hair (check if comp pixel is hair-colored)
        comp_arr = np.array(comp)
        for y in range(64):
            for x in range(64):
                if stamp[y,x,3] > 0:
                    # Check if this position is covered by hair
                    comp_c = tuple(comp_arr[y,x,:3].tolist())
                    # If the comp pixel is a hair color, skip (hair covers face)
                    is_hair_pixel = False
                    for hc in hair:
                        if sum((a-b)**2 for a,b in zip(comp_c,hc)) < 2000:
                            is_hair_pixel = True; break
                    if not is_hair_pixel:
                        comp_arr[y,x,:3] = stamp[y,x,:3]
                        comp_arr[y,x,3] = 255
        comp = Image.fromarray(comp_arr)

    # Upscale 64->256 with crisp pixels
    comp = comp.resize((256,256), Image.NEAREST)
    comp.save(os.path.join(OUT, f"avatar_{i}.png"))
    print(f"avatar_{i}: {face_name.split('.')[0]} {h_name.split('.')[0]} skin{SKIN_TONES.index(skin)}")

print(f"\nDone! 40 portraits in {OUT}")
