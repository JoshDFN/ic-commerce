-- Fix broken Unsplash image URLs with working alternatives

-- Fix Hiking Backpack images (positions 1 and 2 are 404)
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1585916420730-d7f95e942d43?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 1 AND position = 1;

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 1 AND position = 2;

-- Check and fix any other broken URLs by replacing with working alternatives

-- Ensure Tent has working images
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1445308394109-4ec2920981b1?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 2 AND position = 1
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1445308394109%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 2 AND position = 2
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1478827536114%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 2 AND position = 3
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1508873696983%';

-- Ensure Down Jacket has working images
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 6 AND position = 1
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1551028719%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 6 AND position = 2
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1591047139829%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 6 AND position = 3
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1578587018452%';

-- Ensure Shoes has working images
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 4 AND position = 1
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1606107557195%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 4 AND position = 2
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1595950653106%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 4 AND position = 3
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1460353581641%';

-- Ensure Base Layer has working images
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 3 AND position = 1
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1489987707025%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 3 AND position = 2
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1523381210434%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 3 AND position = 3
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1562157873%';

-- Ensure Water Bottle has working images
UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 5 AND position = 1
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1523362628745%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 5 AND position = 2
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1570831739435%';

UPDATE assets SET attachment_url = 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800'
WHERE viewable_type = 'Variant' AND viewable_id = 5 AND position = 3
  AND attachment_url LIKE '%unsplash%' AND attachment_url NOT LIKE '%photo-1548839140%';
