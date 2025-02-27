import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  WebGLRenderer,
  LinearFilter,
  OrthographicCamera,
  Scene,
  PlaneBufferGeometry,
  TextureLoader,
  ShaderMaterial,
  Mesh,
  Color,
  sRGBEncoding,
} from 'three';
import { spring, value } from 'popmotion';
import classNames from 'classnames';
import Swipe from 'react-easy-swipe';
import { usePrefersReducedMotion, useInViewport } from 'hooks';
import prerender from 'utils/prerender';
import { blurOnMouseUp } from 'utils/focus';
import { ReactComponent as ArrowLeft } from 'assets/arrow-left.svg';
import { ReactComponent as ArrowRight } from 'assets/arrow-right.svg';
import { vertex, fragment } from './carouselShader';
import { cleanScene, cleanRenderer, renderPixelRatio } from 'utils/three';
import { getImageFromSrcSet } from 'utils/image';
import './index.css';

function determineIndex(imageIndex, index, images, direction) {
  if (index !== null) return index;
  const length = images.length;
  const prevIndex = (imageIndex - 1 + length) % length;
  const nextIndex = (imageIndex + 1) % length;
  const finalIndex = direction > 0 ? nextIndex : prevIndex;
  return finalIndex;
}

const Carousel = ({ width, height, images, placeholder, ...rest }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [textures, setTextures] = useState();
  const [canvasWidth, setCanvasWidth] = useState();
  const canvas = useRef();
  const imagePlane = useRef();
  const geometry = useRef();
  const material = useRef();
  const scene = useRef();
  const camera = useRef();
  const renderer = useRef();
  const animating = useRef(false);
  const swipeDirection = useRef();
  const lastSwipePosition = useRef();
  const scheduledAnimationFrame = useRef();
  const prefersReducedMotion = usePrefersReducedMotion();
  const inViewport = useInViewport(canvas, true);
  const placeholderRef = useRef();
  const springTween = useRef();
  const springValue = useRef();

  const currentImageAlt = `Slide ${imageIndex + 1} of ${images.length}. ${
    images[imageIndex].alt
  }`;

  useEffect(() => {
    const cameraOptions = [width / -2, width / 2, height / 2, height / -2, 1, 1000];
    renderer.current = new WebGLRenderer({ canvas: canvas.current, antialias: false });
    camera.current = new OrthographicCamera(...cameraOptions);
    scene.current = new Scene();
    renderer.current.setPixelRatio(renderPixelRatio);
    renderer.current.setClearColor(0x111111, 1.0);
    renderer.current.setSize(width, height);
    renderer.current.domElement.style.width = '100%';
    renderer.current.domElement.style.height = 'auto';
    scene.current.background = new Color(0x111111);
    camera.current.position.z = 1;

    return () => {
      animating.current = false;
      cleanScene(scene.current);
      cleanRenderer(renderer.current);
    };
  }, [height, width]);

  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      const textureLoader = new TextureLoader();
      const anisotropy = renderer.current.capabilities.getMaxAnisotropy();

      const texturePromises = images.map(async image => {
        const imageSrc = await getImageFromSrcSet(image);
        const imageTexture = await textureLoader.loadAsync(imageSrc);
        await renderer.current.initTexture(imageTexture);
        imageTexture.encoding = sRGBEncoding;
        imageTexture.minFilter = LinearFilter;
        imageTexture.magFilter = LinearFilter;
        imageTexture.anisotropy = anisotropy;
        imageTexture.generateMipmaps = false;
        return imageTexture;
      });

      const textures = await Promise.all(texturePromises);

      // Cancel if the component has unmounted during async code
      if (!mounted) return;

      material.current = new ShaderMaterial({
        uniforms: {
          dispFactor: { type: 'f', value: 0 },
          direction: { type: 'f', value: 1 },
          currentImage: { type: 't', value: textures[0] },
          nextImage: { type: 't', value: textures[1] },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: false,
        opacity: 1,
      });

      geometry.current = new PlaneBufferGeometry(width, height, 1);
      imagePlane.current = new Mesh(geometry.current, material.current);
      imagePlane.current.position.set(0, 0, 0);
      scene.current.add(imagePlane.current);

      setLoaded(true);
      setTextures(textures);

      requestAnimationFrame(() => {
        renderer.current.render(scene.current, camera.current);
      });
    };

    if (inViewport && !loaded) {
      loadImages();
    }

    return () => {
      mounted = false;
    };
  }, [height, images, inViewport, loaded, width]);

  const goToIndex = useCallback(
    ({ index, direction = 1 }) => {
      if (!textures) return;
      setImageIndex(index);
      const uniforms = material.current.uniforms;
      uniforms.nextImage.value = textures[index];
      uniforms.direction.value = direction;

      const onComplete = () => {
        uniforms.currentImage.value = textures[index];
        uniforms.dispFactor.value = 0;
        animating.current = false;
      };

      if (!prefersReducedMotion && uniforms.dispFactor.value !== 1) {
        animating.current = true;

        springValue.current = value(uniforms.dispFactor.value, value => {
          uniforms.dispFactor.value = value;
          if (value === 1) onComplete();
        });

        springTween.current = spring({
          from: springValue.current.get(),
          to: 1,
          velocity: springValue.current.getVelocity(),
          stiffness: 100,
          damping: 20,
        }).start(springValue.current);
      } else {
        onComplete();
        requestAnimationFrame(() => {
          renderer.current.render(scene.current, camera.current);
        });
      }
    },
    [prefersReducedMotion, textures]
  );

  const navigate = useCallback(
    ({ direction, index = null, ...rest }) => {
      if (!loaded) return;

      if (animating.current) {
        cancelAnimationFrame(scheduledAnimationFrame.current);
        scheduledAnimationFrame.current = requestAnimationFrame(() =>
          navigate({ direction, index, ...rest })
        );
        return;
      }

      const finalIndex = determineIndex(imageIndex, index, textures, direction);
      goToIndex({ index: finalIndex, direction: direction, ...rest });
    },
    [goToIndex, imageIndex, loaded, textures]
  );

  const onNavClick = useCallback(
    index => {
      if (index === imageIndex) return;
      const direction = index > imageIndex ? 1 : -1;
      navigate({ direction, index });
    },
    [imageIndex, navigate]
  );

  useEffect(() => {
    if (textures && loaded) {
      requestAnimationFrame(() => {
        renderer.current.render(scene.current, camera.current);
      });
    }
  }, [goToIndex, loaded, textures]);

  useEffect(() => {
    const handleResize = () => {
      const width = parseInt(getComputedStyle(canvas.current).width, 10);
      setCanvasWidth(width);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    let animation;

    const animate = () => {
      animation = requestAnimationFrame(animate);
      if (animating.current) {
        renderer.current.render(scene.current, camera.current);
      }
    };

    animation = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animation);

      if (springTween.current) {
        springTween.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (placeholder) {
      const purgePlaceholder = () => {
        setShowPlaceholder(false);
      };

      const placeholderElement = placeholderRef.current;
      placeholderElement.addEventListener('transitionend', purgePlaceholder);

      return () => {
        if (placeholderElement) {
          placeholderElement.removeEventListener('transitionend', purgePlaceholder);
        }
      };
    }
  }, [placeholder]);

  const onSwipeMove = useCallback(
    (position, event) => {
      if (animating.current || !material.current) return;
      const { x } = position;
      const absoluteX = Math.abs(x);
      const containerWidth = canvasWidth;
      if (absoluteX > 20) event.preventDefault();
      lastSwipePosition.current = x;
      swipeDirection.current = x > 0 ? -1 : 1;
      const swipePercentage = 1 - ((absoluteX - containerWidth) / containerWidth) * -1;
      const nextIndex = determineIndex(imageIndex, null, images, swipeDirection.current);
      const uniforms = material.current.uniforms;
      const displacementClamp = Math.min(Math.max(swipePercentage, 0), 1);

      uniforms.currentImage.value = textures[imageIndex];
      uniforms.nextImage.value = textures[nextIndex];
      uniforms.direction.value = swipeDirection.current;

      if (!prefersReducedMotion) {
        uniforms.dispFactor.value = displacementClamp;
      }

      requestAnimationFrame(() => {
        renderer.current.render(scene.current, camera.current);
      });
    },
    [canvasWidth, imageIndex, images, prefersReducedMotion, textures]
  );

  const onSwipeEnd = useCallback(() => {
    if (!material.current) return;
    const uniforms = material.current.uniforms;
    const duration = (1 - uniforms.dispFactor.value) * 1000;
    const position = Math.abs(lastSwipePosition.current);
    const minSwipeDistance = canvasWidth * 0.2;
    lastSwipePosition.current = 0;

    if (animating.current) return;
    if (position === 0 || !position) return;

    if (position > minSwipeDistance) {
      navigate({
        duration,
        direction: swipeDirection.current,
      });
    } else {
      uniforms.currentImage.value = uniforms.nextImage.value;
      uniforms.nextImage.value = uniforms.currentImage.value;
      uniforms.dispFactor.value = 1 - uniforms.dispFactor.value;

      navigate({
        direction: swipeDirection.current * -1,
        index: imageIndex,
      });
    }
  }, [canvasWidth, imageIndex, navigate]);

  const handleKeyDown = event => {
    const actions = {
      ArrowRight: () => navigate({ direction: 1 }),
      ArrowLeft: () => navigate({ direction: -1 }),
    };

    const selectedAction = actions[event.key];

    if (!!selectedAction) {
      selectedAction();
    }
  };

  return (
    <div className="carousel" onKeyDown={handleKeyDown} {...rest}>
      <div className="carousel__content">
        <Swipe allowMouseEvents onSwipeEnd={onSwipeEnd} onSwipeMove={onSwipeMove}>
          <div className="carousel__image-wrapper">
            <div
              aria-atomic
              className="carousel__canvas-wrapper"
              aria-live="polite"
              aria-label={currentImageAlt}
              role="img"
            >
              <canvas aria-hidden className="carousel__canvas" ref={canvas} />
            </div>
            {showPlaceholder && placeholder && (
              <img
                aria-hidden
                className={classNames('carousel__placeholder', {
                  'carousel__placeholder--loaded': !prerender && loaded && textures,
                })}
                src={placeholder}
                ref={placeholderRef}
                alt=""
                role="presentation"
              />
            )}
          </div>
        </Swipe>
        <button
          className="carousel__button carousel__button--prev"
          aria-label="Previous slide"
          onClick={() => navigate({ direction: -1 })}
          onMouseUp={blurOnMouseUp}
        >
          <ArrowLeft />
        </button>
        <button
          className="carousel__button carousel__button--next"
          aria-label="Next slide"
          onClick={() => navigate({ direction: 1 })}
          onMouseUp={blurOnMouseUp}
        >
          <ArrowRight />
        </button>
      </div>
      <div className="carousel__nav">
        {images.map((image, index) => (
          <button
            className="carousel__nav-button"
            key={image.alt}
            onClick={() => onNavClick(index)}
            onMouseUp={blurOnMouseUp}
            aria-label={`Jump to slide ${index + 1}`}
            aria-pressed={index === imageIndex}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;
