// Background music via the official YouTube embed.
// Plays 0:25 → 5:50 on loop, carries its position across pages,
// and starts on the first click/tap (browsers block sound before that).
(function () {
    const VIDEO_ID = 'ACEEIS_gCDc';
    const START = 25;   // 0:25
    const END = 350;    // 5:50

    const store = {
        get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
        set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { } }
    };

    let player = null;
    let ready = false;
    // music is "on" once the visitor has started it, until they mute it
    let wantOn = store.get('musicOn') === '1';

    // mute / unmute toggle
    const btn = document.createElement('button');
    btn.className = 'music-toggle';
    btn.setAttribute('aria-label', 'Hidup / matikan lagu');
    document.body.appendChild(btn);
    const paint = () => { btn.textContent = wantOn ? '🔊' : '🔇'; };
    paint();

    const style = document.createElement('style');
    style.textContent = `
        .music-toggle {
            position: fixed; right: 16px; bottom: 16px; z-index: 50;
            width: 48px; height: 48px; border-radius: 50%;
            border: 2px solid rgba(255,255,255,.85);
            background: linear-gradient(45deg, #1f5f99, #3f86c4);
            font-size: 22px; line-height: 1; cursor: pointer;
            box-shadow: 0 6px 20px rgba(15,44,82,.35);
        }
        #yt-music { position: fixed; left: -9999px; top: 0; width: 200px; height: 200px; }
        .music-intro {
            position: fixed; inset: 0; z-index: 100;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 14px; padding: 16px; text-align: center;
            background: rgba(15, 44, 82, 0.75);
            -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
            color: #fff; font-family: 'Arial Rounded MT Bold', Arial, sans-serif;
            transition: opacity .6s ease;
        }
        .music-intro .text { font-size: 1.3rem; text-shadow: 0 2px 10px rgba(0,0,0,.3); }
        .music-intro, .music-intro * { cursor: pointer; }
        .music-intro.gone { opacity: 0; pointer-events: none; }
    `;
    document.head.appendChild(style);

    // Browsers only allow sound after a tap, so on a fresh visit
    // (music never started or muted) ask for one tap first.
    if (store.get('musicOn') === null) {
        const intro = document.createElement('div');
        intro.className = 'music-intro';
        intro.innerHTML = '<div class="text">Tekan skrin untuk mula</div>';
        document.body.appendChild(intro);
        intro.addEventListener('click', (e) => {
            e.stopPropagation();
            intro.classList.add('gone');
            setTimeout(() => intro.remove(), 700);
        });
    }

    const holder = document.createElement('div');
    holder.id = 'yt-music';
    document.body.appendChild(holder);

    function savedTime() {
        const t = parseFloat(store.get('musicTime'));
        return t >= START && t < END ? t : START;
    }

    function play() {
        wantOn = true;
        store.set('musicOn', '1');
        paint();
        if (!ready) return; // onReady will pick it up
        const state = player.getPlayerState();
        if (state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING) {
            player.seekTo(savedTime(), true);
            player.playVideo();
        }
    }

    function stop() {
        wantOn = false;
        store.set('musicOn', '0');
        paint();
        if (ready) player.pauseVideo();
    }

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        wantOn ? stop() : play();
    });

    // First interaction on any page starts (or resumes) the music,
    // unless the visitor muted it.
    const onFirstTouch = (e) => {
        if (btn.contains(e.target)) return; // the toggle handles itself
        if (store.get('musicOn') !== '0') play();
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
        document.addEventListener(ev, onFirstTouch, { once: true, capture: true }));

    // remember position so the next page continues from here
    setInterval(() => {
        if (ready && player.getPlayerState() === YT.PlayerState.PLAYING) {
            store.set('musicTime', player.getCurrentTime());
        }
    }, 500);
    window.addEventListener('pagehide', () => {
        if (ready) store.set('musicTime', player.getCurrentTime());
    });

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('yt-music', {
            videoId: VIDEO_ID,
            playerVars: { start: START, end: END, controls: 0, playsinline: 1, disablekb: 1 },
            events: {
                onReady: () => {
                    ready = true;
                    player.setVolume(80);
                    // try to continue straight away; browsers may still wait for a tap
                    if (wantOn) {
                        player.seekTo(savedTime(), true);
                        player.playVideo();
                    }
                },
                onStateChange: (e) => {
                    if (e.data === YT.PlayerState.ENDED) {
                        // loop back to 0:25
                        store.set('musicTime', START);
                        player.seekTo(START, true);
                        player.playVideo();
                    }
                }
            }
        });
    };

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
})();
