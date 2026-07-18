import numpy as np
import trimesh


def create_villa():
    """Generate a simple stylized villa as a single GLB mesh."""
    # Base slab (foundation)
    base = trimesh.creation.box(extents=[12, 0.6, 10])
    base.apply_translation([0, 0.3, 0])
    base.visual.vertex_colors = [0.82, 0.78, 0.72, 1.0]

    # Main body
    body = trimesh.creation.box(extents=[10, 3.5, 8])
    body.apply_translation([0, 2.05, 0])
    body.visual.vertex_colors = [0.96, 0.94, 0.90, 1.0]

    # Roof
    roof = trimesh.creation.cone(radius=7.5, height=2.5, sections=4)
    roof.apply_translation([0, 5.05, 0])
    roof.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 4, [0, 1, 0]))
    roof.visual.vertex_colors = [0.36, 0.32, 0.28, 1.0]

    # Door
    door = trimesh.creation.box(extents=[1.2, 2.2, 0.2])
    door.apply_translation([0, 1.3, 4.05])
    door.visual.vertex_colors = [0.25, 0.20, 0.15, 1.0]

    # Windows
    windows = []
    for x in [-3.0, 3.0]:
        win = trimesh.creation.box(extents=[1.5, 1.5, 0.15])
        win.apply_translation([x, 2.2, 4.05])
        win.visual.vertex_colors = [0.55, 0.75, 0.85, 1.0]
        windows.append(win)

    # Pool
    pool = trimesh.creation.box(extents=[5, 0.3, 3])
    pool.apply_translation([3.5, 0.15, -4])
    pool.visual.vertex_colors = [0.35, 0.65, 0.85, 1.0]

    # Pool border
    border = trimesh.creation.box(extents=[5.6, 0.4, 3.6])
    border.apply_translation([3.5, 0.2, -4])
    border.visual.vertex_colors = [0.92, 0.90, 0.86, 1.0]

    # Trees (cones)
    trees = []
    for pos in [(-5, -5), (6, 3), (-4, 4)]:
        trunk = trimesh.creation.cylinder(radius=0.2, height=1.0)
        trunk.apply_translation([pos[0], 0.5, pos[1]])
        trunk.visual.vertex_colors = [0.45, 0.35, 0.25, 1.0]
        leaves = trimesh.creation.cone(radius=1.2, height=2.5, sections=8)
        leaves.apply_translation([pos[0], 2.0, pos[1]])
        leaves.visual.vertex_colors = [0.25, 0.55, 0.30, 1.0]
        trees.extend([trunk, leaves])

    scene = trimesh.Scene([base, body, roof, door, pool, border] + windows + trees)
    return scene


if __name__ == "__main__":
    scene = create_villa()
    scene.export(r"G:\Users\novra\Desktop\real_estate_scam\backend\static\models\villa.glb")
    print("Exported villa.glb")
    print(f"Mesh count: {len(scene.geometry)}")
