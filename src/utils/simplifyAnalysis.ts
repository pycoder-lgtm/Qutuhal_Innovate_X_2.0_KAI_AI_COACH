/**
 * Simplifies clinical / anatomical text into clear, 5th-grade everyday English.
 */
export function simplifyAnalysisText(text?: string): string {
  if (!text) return '';

  let simplified = text
    .replace(/Subject presents with an?/gi, 'You have')
    .replace(/Subject exhibits/gi, 'You show')
    .replace(/Subject/gi, 'You')
    .replace(/central adiposity/gi, 'extra weight around the belly')
    .replace(/visceral fat accumulation/gi, 'extra belly fat')
    .replace(/visceral fat/gi, 'belly fat')
    .replace(/visceral region/gi, 'belly area')
    .replace(/adipose tissue/gi, 'body fat')
    .replace(/subcutaneous fat/gi, 'body fat')
    .replace(/adiposity/gi, 'body fat')
    .replace(/anterior pelvic tilt/gi, 'forward hip tilt')
    .replace(/pelvic tilt/gi, 'hip tilt')
    .replace(/pelvic/gi, 'hip')
    .replace(/lumbar hyperlordosis/gi, 'arched lower back')
    .replace(/thoracic kyphosis/gi, 'curved upper back')
    .replace(/forward head carriage/gi, 'head leaning forward')
    .replace(/forward head posture/gi, 'head leaning forward')
    .replace(/scapular winging/gi, 'shoulder blade alignment')
    .replace(/shoulder protraction/gi, 'shoulders curving forward')
    .replace(/internally rotated shoulders/gi, 'shoulders curving forward')
    .replace(/upper-lower cross syndrome/gi, 'posture tightness')
    .replace(/posterior chain musculature/gi, 'back and leg muscles')
    .replace(/posterior chain/gi, 'back muscles')
    .replace(/musculature/gi, 'muscles')
    .replace(/hypertrophy/gi, 'building muscle')
    .replace(/skeletal frame/gi, 'body frame')
    .replace(/waist-to-hip ratio/gi, 'waist shape')
    .replace(/as evidenced by/gi, 'shown by')
    .replace(/evidenced by/gi, 'shown by')
    .replace(/observed/gi, 'noticed');

  return simplified;
}

export function simplifyDeviationTag(deviation?: string): string {
  if (!deviation) return '';
  const lower = deviation.toLowerCase();
  if (lower.includes('anterior pelvic tilt')) return 'Forward hip tilt';
  if (lower.includes('pelvic')) return 'Hip alignment';
  if (lower.includes('forward head')) return 'Head leaning forward';
  if (lower.includes('rounded shoulders') || lower.includes('protraction')) return 'Shoulders curving forward';
  if (lower.includes('hyperlordosis')) return 'Arched lower back';
  if (lower.includes('kyphosis')) return 'Curved upper back';
  return deviation;
}

export function getSomatotypeDefinition(somatotype?: string): string {
  const lower = (somatotype || '').toLowerCase();
  if (lower.includes('ecto')) {
    return "You have a naturally thin build and a fast metabolism that burns energy quickly. To get stronger, focus on eating good food and lifting weights to build up your muscles.";
  }
  if (lower.includes('meso')) {
    return "You have a naturally athletic build that builds muscle easily and stays fit. Your body responds quickly to regular physical exercise and strength training.";
  }
  return "You have a naturally wider build that puts on weight easily. To get the best results, focus on adding more daily movement and lifting weights to turn that mass into strong muscle.";
}
