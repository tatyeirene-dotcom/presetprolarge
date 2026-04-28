import { XMPPreset } from '../types';

export function parseXMP(xmlString: string): XMPPreset {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const getVal = (attr: string, defaultValue: number = 0) => {
    // Some XMP files use attributes on the Description tag, others use nested elements
    const element = xmlDoc.querySelector(`[*|${attr}]`) || xmlDoc.getElementsByTagName(`crs:${attr}`)[0];
    if (element) {
      const val = element.getAttribute(`crs:${attr}`) || element.textContent;
      return val ? parseFloat(val) : defaultValue;
    }
    return defaultValue;
  };

  return {
    exposure: getVal('Exposure2012'),
    contrast: getVal('Contrast2012'),
    highlights: getVal('Highlights2012'),
    shadows: getVal('Shadows2012'),
    saturation: getVal('Saturation'),
    temperature: getVal('Temperature'),
    tint: getVal('Tint'),
    clarity: getVal('Clarity2012'),
  };
}
