//% block="Pixel Animation"
namespace pixelanimation {
    interface RGB {
        r: number;
        g: number;
        b: number;
    }

    interface HSL {
        h: number;
        s: number;
        l: number;
    }



    class Color {
        red: number
        green: number
        blue: number

        constructor(gray: number) {
            this.red = gray
            this.green = gray
            this.blue = gray
        }

        rgb(): number {
            return neopixel.rgb(this.red, this.green, this.blue)
        }

        get h() {
            let min: number = Math.min(Math.min(this.red, this.green), this.blue);
            let max: number = Math.max(Math.max(this.red, this.green), this.blue);

            if (min == max) {
                return 0;
            }

            let hue: number = 0.0;
            if (max == this.red) {
                hue = (this.green - this.blue) / (max - min);

            } else if (max == this.green) {
                hue = 2.0 + (this.blue - this.red) / (max - min);

            } else {
                hue = 4.0 + (this.red - this.green) / (max - min);
            }

            hue = hue * 60;
            if (hue < 0) hue = hue + 360;

            return Math.round(hue);
        }

        get r() { return this.red }
        get g() { return this.green }
        get b() { return this.blue }

        set h(value: number) {
            let { h, s, l } = Color.rgbToHsl(this)
            h = value
            let { r, g, b } = Color.hslToRgb({ h, s, l })
            this.red = r
            this.green = g
            this.blue = b
        }

        static rgbToHsl(rgb: RGB): HSL {
            let { r, g, b } = rgb;
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, Math.max(g, b));
            const min = Math.min(r, Math.max(g, b));
            let h = 0, s = 0, l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                }
                h /= 6;
            }

            h = Math.round(h * 360);
            s = Math.round(s * 100);
            l = Math.round(l * 100);

            return { h, s, l };
        }
        static hslToRgb(hsl: HSL): RGB {
            let { h, s, l } = hsl;
            h /= 360;
            s /= 100;
            l /= 100;

            let r: number, g: number, b: number;

            if (s === 0) {
                // Achromatic (gray)
                r = g = b = l;
            } else {
                const hue2rgb = (p: number, q: number, t: number) => {
                    if (t < 0) t += 1;
                    if (t > 1) t -= 1;
                    if (t < 1 / 6) return p + (q - p) * 6 * t;
                    if (t < 1 / 2) return q;
                    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                    return p;
                };

                const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                const p = 2 * l - q;
                r = hue2rgb(p, q, h + 1 / 3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1 / 3);
            }

            return {
                r: Math.round(r * 255),
                g: Math.round(g * 255),
                b: Math.round(b * 255)
            };
        }

        set(c: RGB) {
            this.red = c.r
            this.green = c.g
            this.blue = c.b
        }
    }

    export class AnimationStrip {
        strip: neopixel.Strip;
        currentEffect: AnimationEffect;
        playlist: Array<AnimationEffect>;
        dots: Array<Color>;
        animationPlayed: boolean

        onAnimationEffectEndedHandler() {
            this.currentEffect = undefined
            console.log("Animation stopped")
            if(this.playlist.length > 0)
                this.playEffect(this.playlist.shift())
        }

        constructor(strip: neopixel.Strip) {
            this.strip = strip
            this.dots = [];
            this.animationPlayed = false
            for (let i = 0; i < this.strip.length(); i++)
                this.dots.push(new Color(0))

            this.playlist = []

            control.inBackground(() => { this.updateStrip() })
        }

        updateStrip() {
            while(true) {
                for (let i = 0; i < this.dots.length; i++)
                    this.strip.setPixelColor(i, this.dots[i].rgb())
                this.strip.show();
                pause(20);
            }
        }

        queue(eff: AnimationEffect) {
            this.playlist.push(eff)
        }

        play(eff: AnimationEffect) {
            this.playlist.unshift(eff)
            if (this.currentEffect)
                this.currentEffect.immediatlyStop()
            else
                this.onAnimationEffectEndedHandler()
        }

        private playEffect(eff: AnimationEffect) {
            this.currentEffect = eff
            eff.onAnimationEnded = () => { this.onAnimationEffectEndedHandler() }
            control.inBackground(() => {
                this.animationPlayed = true
                eff.play(this)
            })
        }

        //% block
        //% animationStrip.defl=anim
        stopAnimation() {
            this.playlist = []
            this.currentEffect.immediatlyStop()
        }
    }

    abstract class AnimationEffect {
        anim: AnimationStrip
        immediatelyStopFlag: boolean
        looped: boolean
        onAnimationEnded: () => void
        play(anim: AnimationStrip): void {}
        stop(): void {}

        constructor(looped: boolean) {
            this.immediatelyStopFlag = false
            this.looped = looped
        }

        immediatlyStop() {
            this.immediatelyStopFlag = true
        }
    }

    export class SetRainbowAnimation extends AnimationEffect {
        delay: number
        
        constructor(delay: number) {
            super(false)
            this.delay = delay
        }

        play(anim: AnimationStrip) {
            this.anim = anim

            for (let i = 0; i < this.anim.dots.length; i++) {
                let { r, g, b } = Color.hslToRgb({ h : i * 360 / this.anim.dots.length, s: 100, l: 50 });
                this.anim.dots[i].set({ r, g, b })
                pause(this.delay / this.anim.dots.length)
                if(this.immediatelyStopFlag)
                    break;
            }

            this.onAnimationEnded()
        }
    }

    export class RotateAnimation extends AnimationEffect {
        delay: number
        backwards: boolean

        constructor(delay: number, backwards: boolean = false, looped: boolean = true) {
            super(looped)
            this.delay = delay
            this.backwards = backwards
        }

        play(anim: AnimationStrip) {
            this.anim = anim
            let start = input.runningTime()
            while (!this.immediatelyStopFlag && (input.runningTime() - start) < this.delay) {
                if( ! this.backwards ) {
                    let d = this.anim.dots[this.anim.dots.length - 1]
                    for (let i = this.anim.dots.length - 1; i > 0; i--) {
                        this.anim.dots[i] = this.anim.dots[i - 1]
                    }
                    this.anim.dots[0] = d
                }
                else {
                    let d = this.anim.dots[0]
                    for (let i = 0; i < this.anim.dots.length - 1; i++) {
                        this.anim.dots[i] = this.anim.dots[i + 1]
                    }
                    this.anim.dots[this.anim.dots.length - 1] = d
                }
                pause(this.delay / this.anim.dots.length)
            }
            this.onAnimationEnded()
        }
    }

    //% block
    //% blockSetVariable=anim
    //% animationStrip.defl=strip
    export function initAnimationStrip(strip: neopixel.Strip): AnimationStrip {
        return new AnimationStrip(strip);
    }
}