import { useEffect, useRef } from 'react'
import { compass } from '../scene/compass'

/** Rosa dos ventos do "norte do modelo" (= direção da mesa da foto 360°). */
export function Compass() {
  const rose = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const apply = (azimuth: number) => {
      if (rose.current) rose.current.style.transform = `rotate(${azimuth}rad)`
    }
    apply(compass.azimuth)
    compass.listeners.add(apply)
    return () => void compass.listeners.delete(apply)
  }, [])
  return (
    <div className="compass" title="Norte do modelo = direção da sua mesa (foto 360°)">
      <div className="rose" ref={rose}>
        <span className="n">N</span>
        <span className="e">L</span>
        <span className="s">S</span>
        <span className="w">O</span>
      </div>
    </div>
  )
}
