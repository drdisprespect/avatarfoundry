import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  		},
  		fontFamily: {
  			sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
  		},
  		backdropBlur: {
  			xs: '2px',
  		},
		animation: {
			'accordion-down': 'accordion-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
			'accordion-up': 'accordion-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
			'slide-in-from-bottom': 'slideInFromBottom 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
			'slide-in-from-top': 'slideInFromTop 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
			'slide-in-from-left': 'slideInFromLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
			'slide-in-from-right': 'slideInFromRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
			'fade-in': 'fadeIn 0.4s ease-out',
			'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
			'apple-scale-in': 'appleScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
			'apple-scale-out': 'appleScaleOut 0.2s cubic-bezier(0.4, 0, 1, 1)',
			'float': 'float 6s ease-in-out infinite',
			'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
			'glow': 'glow 2s ease-in-out infinite alternate',
		},
  		transitionTimingFunction: {
  			'apple': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'ease-apple': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			slideInFromBottom: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(100px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideInFromTop: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(-100px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideInFromLeft: {
  				from: {
  					opacity: '0',
  					transform: 'translateX(-100px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			slideInFromRight: {
  				from: {
  					opacity: '0',
  					transform: 'translateX(100px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			fadeIn: {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},			scaleIn: {
				from: {
					opacity: '0',
					transform: 'scale(0.9)'
				},
				to: {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			appleScaleIn: {
				from: {
					opacity: '0',
					transform: 'scale(0.96)'
				},
				to: {
					opacity: '1',
					transform: 'scale(1)'
				}
			},
			appleScaleOut: {
				from: {
					opacity: '1',
					transform: 'scale(1)'
				},
				to: {
					opacity: '0',
					transform: 'scale(0.96)'
				}
			},
			float: {
				'0%, 100%': { transform: 'translateY(0px)' },
				'50%': { transform: 'translateY(-8px)' }
			},
			pulseSubtle: {
				'0%, 100%': { opacity: '1' },
				'50%': { opacity: '0.8' }
			},
			glow: {
				'0%': { boxShadow: '0 0 20px rgba(10, 132, 255, 0.3)' },
				'100%': { boxShadow: '0 0 30px rgba(10, 132, 255, 0.5)' }
			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
