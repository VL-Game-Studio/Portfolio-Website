import React, { useRef, useEffect, memo } from 'react';
import classNames from 'classnames';
import { usePrefersReducedMotion } from 'hooks';
import { spring, chain, delay, value } from 'popmotion';
import './index.css';

// prettier-ignore
const glyphs = [
  'A', 'a', 'B', 'b', 'C', 'c', 'D', 'd',
  'E', 'e', 'F', 'f', 'G', 'g', 'H', 'h',
  'I', 'i', 'J', 'j', 'K', 'k', 'L', 'l',
  'M', 'm', 'N', 'n', 'O', 'o', 'P', 'p',
  'Q', 'q', 'R', 'r', 'S', 's', 'T', 't',
  'U', 'u', 'V', 'v', 'W', 'w', 'X', 'x',
  'Y', 'y', 'Z', 'z',
];

const CharType = {
  Glyph: 'glyph',
  Value: 'value',
};

function shuffle(content, output, position) {
  return content.map((value, index) => {
    if (index < position) {
      return { type: CharType.Value, value };
    }

    if (position % 1 < 0.5) {
      const rand = Math.floor(Math.random() * glyphs.length);
      return { type: CharType.Glyph, value: glyphs[rand] };
    }

    return { type: CharType.Glyph, value: output[index].value };
  });
}

const DecoderText = ({
  text,
  start = true,
  delay: startDelay = 0,
  className,
  ...rest
}) => {
  const output = useRef([{ type: CharType.Glyph, value: '' }]);
  const container = useRef();
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const content = text.split('');
    let animation;

    const renderOutput = () => {
      const characterMap = output.current.map(item => {
        return `<span class="decoder-text__${item.type}">${item.value}</span>`;
      });

      container.current.innerHTML = characterMap.join('');
    };

    const springValue = value(0, position => {
      output.current = shuffle(content, output.current, position);
      renderOutput();
    });

    if (start && !animation && !reduceMotion) {
      animation = chain(
        delay(startDelay),
        spring({
          from: 0,
          to: content.length,
          stiffness: 8,
          damping: 5,
        })
      ).start(springValue);
    }

    if (reduceMotion) {
      output.current = content.map((value, index) => ({
        type: CharType.Value,
        value: content[index],
      }));
      renderOutput();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [reduceMotion, start, startDelay, text]);

  return (
    <span className={classNames('decoder-text', className)} aria-label={text} {...rest}>
      <span aria-hidden className="decoder-text__content" ref={container} />
    </span>
  );
};

export default memo(DecoderText);
