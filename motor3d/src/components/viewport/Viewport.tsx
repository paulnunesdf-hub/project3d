import { Canvas } from '@react-three/fiber'
import { Grid, OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei'
import { useDesignStore } from '../../store/designStore'
import { Scene } from './Scene'
import { MarqueePicker } from './MarqueePicker'
import { palette } from './palette'

/** The 3D workspace: lighting, a reference floor grid, orbit navigation, an
 *  orientation gizmo, and the cabinet scene. Clicking empty space deselects. */
export function Viewport() {
  const select = useDesignStore((s) => s.select)
  const orbitEnabled = useDesignStore((s) => s.orbitEnabled)
  const dragMode = useDesignStore((s) => s.dragMode)
  const paint = palette()

  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [1.2, 1, 1.6], fov: 45 }}
      // Click on empty space clears the selection. This is a click (not a drag),
      // so a marquee box-drag never triggers it — the two don't collide.
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={[paint.scene]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1.3} />
      <directionalLight position={[-2, 2, -3]} intensity={0.4} />

      <Grid
        args={[10, 10]}
        cellSize={0.1}
        cellColor={paint.grid}
        sectionSize={1}
        sectionColor={paint.gridMajor}
        fadeDistance={18}
        fadeStrength={1.5}
        infiniteGrid
      />

      <Scene />
      <MarqueePicker />

      <OrbitControls makeDefault enabled={orbitEnabled && dragMode === 'orbit'} />
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </Canvas>
  )
}
