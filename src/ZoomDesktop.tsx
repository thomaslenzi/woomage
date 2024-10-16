import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ZoomDesktop.module.css';

// const SRC = '/small.jpg';
const SRC = '/large.jpg';

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(x, max));
}

function ZoomDesktop() {
  // Display "modal" ? Simple On/Off switch to simulate an open/closed modal
  const [shouldDisplayModal, setDisplayModal] = useState(false);
  const onToggleModal = useCallback(() => setDisplayModal((v) => !v), []);

  /**
   * All refs used later
   * Ref is often used instead of state in order to avoid the recomputation of a callback function and thus the "onload" on the ref of the element
   */

  // Holds the size of the image (set on load)
  const imageDataRef = useRef<{ width: number; height: number }>({
    width: 1,
    height: 1,
  });
  // Holds the size of the container in which the image is rendered (set on load)
  const containerDataRef = useRef<{
    width: number;
    height: number;
    imageRef: HTMLDivElement | null;
  }>({
    width: 1,
    height: 1,
    imageRef: null,
  });
  // Offset to align the image to the center of the container
  const offsetDataRef = useRef<{
    baseX: number;
    baseY: number;
    dragX: number;
    dragY: number;
  }>({
    baseX: 0, // set on load
    baseY: 0, // set on load
    dragX: 0, // changed along with dragOffset state
    dragY: 0, // changed along with dragOffset state
  });
  // Zoom info (min x1, max x3, current x1)
  const zoomDataRef = useRef<{ min: number; max: number; current: number }>({
    min: 1, // set on load = multiplier so that image fits into container
    max: 3, // set on load
    current: 1, // changed along with zoomLevel state. Is used in a callback function in order to avoid recomputation of the function
  });
  // Drag info
  const dragDataRef = useRef<{ isDragging: boolean }>({
    isDragging: false, // changed in the callbacks
  });

  /**
   * All states used later
   */

  // Offset when moving the image on a given zoom level
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Zoom level
  const [zoomLevel, setZoomLevel] = useState(1);
  // Pin position
  const [pin, setPin] = useState({ x: 0, y: 0 });

  /**
   * Image load
   */

  useEffect(() => {
    const img = new Image();
    img.src = SRC;
    img.onload = () => {
      imageDataRef.current = {
        width: img.width,
        height: img.height,
      };
    };
  }, []);

  /**
   * Container load
   */

  const onLoadContainer = useCallback((r: HTMLDivElement | null) => {
    if (r) {
      containerDataRef.current.width = r.clientWidth;
      containerDataRef.current.height = r.clientHeight;
      // Compute the default zoom level for the image to fit inside the container
      let zl = 1;
      // Image larger than container => zl < 1, negative offset
      if (
        imageDataRef.current.width > containerDataRef.current.width ||
        imageDataRef.current.height > containerDataRef.current.height
      ) {
        zl = Math.min(
          containerDataRef.current.width / imageDataRef.current.width,
          containerDataRef.current.height / imageDataRef.current.height,
        );
      }
      // Save the zoom data
      zoomDataRef.current.min = zl;
      zoomDataRef.current.max = 3;
      zoomDataRef.current.current = zl;
      setZoomLevel(zl);
      // Compute the base offset to center the image
      offsetDataRef.current.baseX =
        (imageDataRef.current.width - containerDataRef.current.width) / 2;
      offsetDataRef.current.baseY =
        (imageDataRef.current.height - containerDataRef.current.height) / 2;
      // Reset the drag offset
      offsetDataRef.current.dragX = 0;
      offsetDataRef.current.dragY = 0;
      setDragOffset({ x: 0, y: 0 });
    }
  }, []);

  /**
   * Zoom functions
   */

  // In
  const zoomIn = useCallback(
    () =>
      setZoomLevel((z) => {
        const nz = clamp(
          z + 0.1,
          zoomDataRef.current.min,
          zoomDataRef.current.max,
        );
        zoomDataRef.current.current = nz;
        return nz;
      }),
    [],
  );

  // Out
  const zoomOut = useCallback(
    () =>
      setZoomLevel((z) => {
        const nz = clamp(
          z - 0.1,
          zoomDataRef.current.min,
          zoomDataRef.current.max,
        );
        zoomDataRef.current.current = nz;
        const oversizeX = Math.max(
          imageDataRef.current.width * nz - containerDataRef.current.width,
          0,
        );
        const oversizeY = Math.max(
          imageDataRef.current.height * nz - containerDataRef.current.height,
          0,
        );
        setDragOffset((prev) => {
          const x = clamp(prev.x, -oversizeX / 2, oversizeX / 2);
          const y = clamp(prev.y, -oversizeY / 2, oversizeY / 2);
          offsetDataRef.current.dragX = x;
          offsetDataRef.current.dragY = y;
          return { x, y };
        });
        return nz;
      }),
    [],
  );

  /**
   * Drag functions
   */

  // Start
  const onDragStart = useCallback(() => {
    dragDataRef.current.isDragging = true;
  }, []);

  // Move
  const onDragMove = useCallback((e: MouseEvent) => {
    if (dragDataRef.current.isDragging) {
      const oversizeX = Math.max(
        imageDataRef.current.width * zoomDataRef.current.current -
          containerDataRef.current.width,
        0,
      );
      const oversizeY = Math.max(
        imageDataRef.current.height * zoomDataRef.current.current -
          containerDataRef.current.height,
        0,
      );
      setDragOffset((prev) => {
        const x = clamp(prev.x - e.movementX, -oversizeX / 2, oversizeX / 2);
        const y = clamp(prev.y - e.movementY, -oversizeY / 2, oversizeY / 2);
        offsetDataRef.current.dragX = x;
        offsetDataRef.current.dragY = y;
        return { x, y };
      });
    }
  }, []);

  // Stop
  const onDragEnd = useCallback(() => {
    dragDataRef.current.isDragging = false;
  }, []);

  /**
   * Pin
   */

  const onPinPlace = useCallback((e: MouseEvent) => {
    if (containerDataRef.current.imageRef) {
      const box = containerDataRef.current.imageRef.getBoundingClientRect();
      setPin({
        x: (e.clientX - box.x) / zoomDataRef.current.current,
        y: (e.clientY - box.y) / zoomDataRef.current.current,
      });
    }
  }, []);

  /**
   * Image events
   */
  const onLoadImage = useCallback((r: HTMLDivElement | null) => {
    if (r) {
      containerDataRef.current.imageRef = r;
      r.addEventListener('mousedown', onDragStart);
      r.addEventListener('mousemove', onDragMove);
      r.addEventListener('mouseup', onDragEnd);
      r.addEventListener('dblclick', onPinPlace);
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Actual logic */}
      {shouldDisplayModal ? (
        // Large image
        <div className={styles.largeContainer} ref={onLoadContainer}>
          <div
            style={{
              width: imageDataRef.current.width,
              height: imageDataRef.current.height,
              backgroundImage: `url('${SRC}')`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center center',
              transform: `translateX(${-offsetDataRef.current.baseX - dragOffset.x}px) translateY(${-offsetDataRef.current.baseY - dragOffset.y}px) scale(${zoomLevel})`,
            }}
            ref={onLoadImage}
          >
            <div
              style={{
                height: '10px',
                width: '10px',
                backgroundColor: 'red',
                position: 'absolute',
                left: `${pin.x}px`,
                top: `${pin.y}px`,
                marginLeft: '-5px',
                marginTop: '-5px',
                transform: `scale(${1 / zoomLevel})`,
              }}
            />
          </div>
          <div className={styles.controls}>
            <button onClick={zoomOut}>-</button>
            {`x${zoomLevel.toFixed(2)}`}
            <button onClick={zoomIn}>+</button>
            <button onClick={onToggleModal}>x</button>
          </div>
        </div>
      ) : (
        // Small image
        <img
          src={SRC}
          alt="img"
          className={styles.smallImage}
          onClick={onToggleModal}
        />
      )}
      {/* Info */}
      <p>Click the small image to open the "modal"</p>
      <p>Double-click the large image to place a pin</p>
      <p>Zoom on the image with the buttons on the bottom </p>
      <p>Drag the image to move around (when zoomed enough)</p>
    </div>
  );
}

export default ZoomDesktop;
