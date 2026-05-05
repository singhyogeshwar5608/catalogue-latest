'use client';

import { useEffect } from 'react';
import { setGoogtransCookieForTarget } from '@/src/lib/googleTranslateConfig';

// Map Indian states to Google Translate language codes
const stateToLanguage: Record<string, string> = {
  // Hindi states
  'Uttar Pradesh': 'hi',
  'Bihar': 'hi',
  'Madhya Pradesh': 'hi',
  'Rajasthan': 'hi',
  'Delhi': 'hi',
  'Haryana': 'hi',
  'Uttarakhand': 'hi',
  'Himachal Pradesh': 'hi',
  'Jharkhand': 'hi',
  'Chhattisgarh': 'hi',
  'Chandigarh': 'hi',
  
  // Marathi
  'Maharashtra': 'mr',
  
  // Bengali
  'West Bengal': 'bn',
  'Tripura': 'bn',
  
  // Tamil
  'Tamil Nadu': 'ta',
  'Puducherry': 'ta',
  
  // Kannada
  'Karnataka': 'kn',
  
  // Gujarati
  'Gujarat': 'gu',
  
  // Malayalam
  'Kerala': 'ml',
  
  // Punjabi
  'Punjab': 'pa',
  
  // Telugu
  'Andhra Pradesh': 'te',
  'Telangana': 'te',
  
  // Assamese
  'Assam': 'as',
  
  // Odia
  'Odisha': 'or',
  
  // Urdu
  'Jammu and Kashmir': 'ur',
};

export default function AutoTranslate() {
  useEffect(() => {
    // Check if auto-translation has already run this session
    const hasAutoTranslated = sessionStorage.getItem('auto_translated');
    const userSelectedLang = localStorage.getItem('user_selected_lang');
    
    // If user has manually selected a language, don't auto-translate
    if (userSelectedLang || hasAutoTranslated) {
      return;
    }

    // Detect user's location and set language
    async function detectAndSetLanguage() {
      try {
        const response = await fetch('http://ip-api.com/json');
        const data = await response.json();
        
        if (data.status === 'success' && data.regionName) {
          const state = data.regionName;
          const langCode = stateToLanguage[state] || 'en';
          
          if (langCode !== 'en') {
            setGoogtransCookieForTarget(langCode);
            sessionStorage.setItem('current_lang', langCode);
          }
          
          // Mark that auto-translation has run
          sessionStorage.setItem('auto_translated', 'true');
          
          console.log(`Auto-detected state: ${state}, Language: ${langCode}`);
        }
      } catch (error) {
        console.error('Failed to detect location:', error);
        // Default to English on error
        sessionStorage.setItem('auto_translated', 'true');
      }
    }

    detectAndSetLanguage();
  }, []);

  return null; // This component doesn't render anything
}
