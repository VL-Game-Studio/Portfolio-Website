import React, { useState, useEffect, useRef, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Intro from './Intro';
import ProjectSummary from './ProjectSummary';
import Profile from './Profile';
import Footer from 'components/Footer';
import { usePrefersReducedMotion, useRouteTransition } from 'hooks';
import modernTexture from 'assets/modern.jpg';
import modernTextureLarge from 'assets/modern-large.jpg';
import modernTexturePlaceholder from 'assets/modern-placeholder.jpg';
import dttTexture from 'assets/dtt.jpg';
import dttTextureLarge from 'assets/dtt-large.jpg';
import dttTexturePlaceholder from 'assets/dtt-placeholder.jpg';
import mystgangTexture from 'assets/mystgang.jpg';
import mystgangTextureLarge from 'assets/mystgang-large.jpg';
import mystgangTexturePlaceholder from 'assets/mystgang-placeholder.jpg';
import iphone11 from 'assets/iphone-11.glb';
import macbookPro from 'assets/macbook-pro.glb';

const disciplines = ['Developer', 'Creator', 'Animator', 'Illustrator', 'Guitarist'];

export default function Home(props) {
  const { status } = useRouteTransition();
  const { hash, state } = useLocation();
  const initHash = useRef(true);
  const [visibleSections, setVisibleSections] = useState([]);
  const [scrollIndicatorHidden, setScrollIndicatorHidden] = useState(false);
  const intro = useRef();
  const projectOne = useRef();
  const projectTwo = useRef();
  const projectThree = useRef();
  const about = useRef();
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const revealSections = [intro, projectOne, projectTwo, projectThree, about];

    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const section = entry.target;
          observer.unobserve(section);
          if (visibleSections.includes(section)) return;
          setVisibleSections(prevSections => [...prevSections, section]);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    const indicatorObserver = new IntersectionObserver(([entry]) => {
      setScrollIndicatorHidden(!entry.isIntersecting);
    }, { rootMargin: '-100% 0px 0px 0px' });

    revealSections.forEach(section => {
      sectionObserver.observe(section.current);
    });

    indicatorObserver.observe(intro.current);

    return () => {
      sectionObserver.disconnect();
      indicatorObserver.disconnect();
    };
  }, [visibleSections]);

  useEffect(() => {
    const hasEntered = status === 'entered';
    const supportsNativeSmoothScroll = 'scrollBehavior' in document.documentElement.style;
    let scrollObserver;
    let scrollTimeout;

    const handleHashchange = (hash, scroll) => {
      clearTimeout(scrollTimeout);
      const hashSections = [intro, projectOne, projectTwo, projectThree, about];
      const hashString = hash.replace('#', '');
      const element = hashSections.filter(item => item.current.id === hashString)[0];
      if (!element) return;
      const behavior = scroll && !prefersReducedMotion ? 'smooth' : 'instant';
      const top = element.current.offsetTop;

      scrollObserver = new IntersectionObserver((entries, observer) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          scrollTimeout = setTimeout(() => {
            element.current.focus();
          }, prefersReducedMotion ? 0 : 400);
          observer.unobserve(entry.target);
        }
      }, { rootMargin: '-20% 0px -20% 0px' });

      scrollObserver.observe(element.current);

      if (supportsNativeSmoothScroll) {
        window.scroll({
          top,
          left: 0,
          behavior,
        });
      } else {
        window.scrollTo(0, top);
      }
    };

    if (hash && initHash.current && hasEntered) {
      handleHashchange(hash, false);
      initHash.current = false;
    } else if (!hash && initHash.current && hasEntered) {
      window.scrollTo(0, 0);
      initHash.current = false;
    } else if (hasEntered) {
      handleHashchange(hash, true);
    }

    return () => {
      clearTimeout(scrollTimeout);
      if (scrollObserver) {
        scrollObserver.disconnect();
      }
    };
  }, [hash, state, prefersReducedMotion, status]);

  return (
    <Fragment>
      <Helmet>
        <title>Cody Bennett | Designer + Developer</title>
        <meta
          name="description"
          content="Portfolio of Cody Bennett – a designer, full-stack developer, and creator of web & mobile solutions with a focus on motion and user experience."
        />
        <link rel="prefetch" href={iphone11} as="fetch" crossorigin="" />
        <link rel="prefetch" href={macbookPro} as="fetch" crossorigin="" />
      </Helmet>
      <Intro
        id="intro"
        sectionRef={intro}
        disciplines={disciplines}
        scrollIndicatorHidden={scrollIndicatorHidden}
      />
      <ProjectSummary
        id="project-1"
        sectionRef={projectOne}
        visible={visibleSections.includes(projectOne.current)}
        index={1}
        title="Putting Players First"
        description="Building a community that puts players and game health first, not profits."
        buttonText="View Project"
        buttonTo="/projects/modern"
        model={{
          type: 'laptop',
          alt: 'The Modern Project Landing Page',
          textures: [
            {
              src: modernTexture,
              srcSet: `${modernTexture} 800w, ${modernTextureLarge} 1440w`,
              placeholder: modernTexturePlaceholder,
            },
          ],
        }}
      />
      <ProjectSummary
        id="project-2"
        sectionRef={projectTwo}
        visible={visibleSections.includes(projectTwo.current)}
        index={2}
        title="A Tool for Everything"
        description="Creating a platfrom to help developers build better software."
        buttonText="View Project"
        buttonTo="/projects/dtt"
        model={{
          type: 'laptop',
          alt: 'DevTech Tools Landing Page',
          textures: [
            {
              src: dttTexture,
              srcSet: `${dttTexture} 800w, ${dttTextureLarge} 1440w`,
              placeholder: dttTexturePlaceholder,
            },
          ],
        }}
      />
      <ProjectSummary
        id="project-3"
        sectionRef={projectThree}
        visible={visibleSections.includes(projectThree.current)}
        index={3}
        title="MystGang"
        description="A personal site for a gaming content creator."
        buttonText="View Project"
        buttonTo="/projects/mystgang"
        model={{
          type: 'laptop',
          alt: 'MystGang Website',
          textures: [
            {
              src: mystgangTexture,
              srcSet: `${mystgangTexture} 800w, ${mystgangTextureLarge} 1440w`,
              placeholder: mystgangTexturePlaceholder,
            },
          ],
        }}
      />
      <Profile
        sectionRef={about}
        visible={visibleSections.includes(about.current)}
        id="about"
      />
      <Footer />
    </Fragment>
  );
}
