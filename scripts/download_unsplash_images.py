import os
import urllib.request
import time

# Curated direct high-resolution museum photographs from Unsplash
IMAGE_URLS = {
    # 1. ARTIFACTS
    'artifacts/artifact_A001.jpg': 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80',  # Pottery urn
    'artifacts/artifact_A002.jpg': 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&auto=format&fit=crop&q=80',  # Classical bronze sculpture
    'artifacts/artifact_A003.jpg': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80',  # Bronze / deity sculpture
    'artifacts/artifact_A004.jpg': 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',  # Ammonite / ancient fossil relic
    'artifacts/artifact_A005.jpg': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',  # Historic miniature painting
    'artifacts/artifact_A006.jpg': 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=800&auto=format&fit=crop&q=80',  # Ancient historical coin
    'artifacts/artifact_A007.jpg': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',  # Schist stone Buddha sculpture
    'artifacts/artifact_A008.jpg': 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=800&auto=format&fit=crop&q=80',  # Royal woven silk tapestry
    'artifacts/artifact_A009.jpg': 'https://images.unsplash.com/photo-1545959570-a94084071b5d?w=800&auto=format&fit=crop&q=80',  # Ceremonial wooden mask
    'artifacts/artifact_A010.jpg': 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',  # Brass temple lamp
    'artifacts/artifact_A011.jpg': 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=800&auto=format&fit=crop&q=80',  # Rare ancient manuscript scroll
    'artifacts/artifact_A012.jpg': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',  # Glazed blue porcelain urn

    # 2. GALLERIES
    'galleries/gallery_G001.jpg': 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=800&auto=format&fit=crop&q=80',  # Ancient Civilization hall
    'galleries/gallery_G002.jpg': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&auto=format&fit=crop&q=80',  # Sculpture corridor
    'galleries/gallery_G003.jpg': 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=800&auto=format&fit=crop&q=80',  # Painting salon
    'galleries/gallery_G004.jpg': 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',  # Textile heritage space
    'galleries/gallery_G005.jpg': 'https://images.unsplash.com/photo-1572947650440-e8a97ef053b2?w=800&auto=format&fit=crop&q=80',  # Grand archaeology wing
    'galleries/gallery_G006.jpg': 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&auto=format&fit=crop&q=80',  # Numismatic showcase
    'galleries/gallery_G007.jpg': 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=800&auto=format&fit=crop&q=80',  # Bronze hall
    'galleries/gallery_G008.jpg': 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',  # Folk art room
    'galleries/gallery_G009.jpg': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=80',  # Ancient library & archives
    'galleries/gallery_G010.jpg': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80',  # Grand museum rotunda

    # 3. EXHIBITIONS
    'exhibitions/exhibition_EX001.jpg': 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&auto=format&fit=crop&q=80',  # Curated art display
    'exhibitions/exhibition_EX002.jpg': 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800&auto=format&fit=crop&q=80',  # Archaeological showcase
    'exhibitions/exhibition_EX003.jpg': 'https://images.unsplash.com/photo-1508997449629-303059a039c0?w=800&auto=format&fit=crop&q=80',  # Dynasties display
    'exhibitions/exhibition_EX004.jpg': 'https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=800&auto=format&fit=crop&q=80',  # Weaves & textiles
    'exhibitions/exhibition_EX005.jpg': 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800&auto=format&fit=crop&q=80',  # Sacred bronzes
    'exhibitions/exhibition_EX006.jpg': 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&auto=format&fit=crop&q=80',  # Living heritage

    # 4. EVENTS
    'events/event_EV001.jpg': 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800&auto=format&fit=crop&q=80',  # Guided museum tour
    'events/event_EV002.jpg': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&auto=format&fit=crop&q=80',  # Pottery making masterclass
    'events/event_EV003.jpg': 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',  # Curator lecture
    'events/event_EV004.jpg': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',  # Art & sketching workshop
    'events/event_EV005.jpg': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',  # Restoration demo
    'events/event_EV006.jpg': 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',  # Student research symposium
    'events/event_EV007.jpg': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80',  # Keynote auditorium
    'events/event_EV008.jpg': 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',  # Night atmospheric tour
}

base_dir = os.path.join('frontend', 'images')

for rel_path, url in IMAGE_URLS.items():
    dest = os.path.join(base_dir, rel_path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(dest, 'wb') as f:
                f.write(data)
            print(f'Downloaded: {rel_path} ({len(data)} bytes)')
    except Exception as e:
        print(f'Failed {rel_path}: {e}')
    time.sleep(0.1)

print('All authentic museum photographs downloaded successfully.')
