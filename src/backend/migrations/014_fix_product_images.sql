-- Fix product images - ensure all products have 4 images each
-- This migration adds images only if they don't exist (using position check)

-- Premium Hiking Backpack (Variant 1) - ensure we have images at positions 1,2,3
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 1, 1, 'https://images.unsplash.com/photo-1585916420730-d7f95e942d43?w=800', 'Hiking Backpack Side View', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=1 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 1, 2, 'https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=800', 'Hiking Backpack Detail', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=1 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 1, 3, 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=800', 'Hiking Backpack In Use', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=1 AND position=3);

-- Ultralight Tent (Variant 2)
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 2, 1, 'https://images.unsplash.com/photo-1445308394109-4ec2920981b1?w=800', 'Tent Interior View', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=2 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 2, 2, 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800', 'Tent at Sunset', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=2 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 2, 3, 'https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?w=800', 'Camping Setup', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=2 AND position=3);

-- Merino Base Layer (Variant 3)
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 3, 1, 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800', 'Base Layer Folded', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=3 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 3, 2, 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', 'Clothing Display', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=3 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 3, 3, 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800', 'Fabric Detail', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=3 AND position=3);

-- Trail Running Shoes (Variant 4)
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 4, 1, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', 'Trail Shoes Top View', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=4 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 4, 2, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800', 'Trail Shoes Sole', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=4 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 4, 3, 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800', 'Running Shoes Lifestyle', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=4 AND position=3);

-- Water Bottle (Variant 5)
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 5, 1, 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800', 'Water Bottle Side', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=5 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 5, 2, 'https://images.unsplash.com/photo-1570831739435-6601aa3fa4fb?w=800', 'Water Bottle Collection', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=5 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 5, 3, 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800', 'Hydration Gear', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=5 AND position=3);

-- Down Puffy Jacket (Variant 6)
INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 6, 1, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800', 'Down Jacket Front', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=6 AND position=1);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 6, 2, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800', 'Down Jacket Lifestyle', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=6 AND position=2);

INSERT OR IGNORE INTO assets (viewable_type, viewable_id, position, attachment_url, alt, asset_type, created_at, updated_at)
SELECT 'Variant', 6, 3, 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800', 'Winter Jacket Detail', 'Image', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM assets WHERE viewable_type='Variant' AND viewable_id=6 AND position=3);
