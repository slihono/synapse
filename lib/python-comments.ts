import type { Language } from './translations'

const first: Record<Language, string> = {
  fr: '# Modèle linéaire distinct : entraîner un poids et un biais',
  en: '# Separate linear model: train one weight and one bias',
  es: '# Modelo lineal distinto: entrenar un peso y un sesgo',
  ar: '# نموذج خطي منفصل: تدريب وزن واحد وانحياز واحد',
  hi: '# अलग रैखिक मॉडल: एक भार और एक बायस को प्रशिक्षित करें',
  tr: '# Ayrı doğrusal model: bir ağırlık ve bir bias eğit',
  pt: '# Modelo linear separado: treinar um peso e um viés',
}
const last: Record<Language, string> = {
  fr: '# Recalculer la prédiction après la dernière mise à jour',
  en: '# Recalculate the prediction after the final update',
  es: '# Recalcular la predicción después de la última actualización',
  ar: '# إعادة حساب التنبؤ بعد التحديث الأخير',
  hi: '# अंतिम अपडेट के बाद अनुमान दोबारा निकालें',
  tr: '# Son güncellemeden sonra tahmini yeniden hesapla',
  pt: '# Recalcular a previsão após a última atualização',
}

export function localizePythonComments(code: string, language: Language) {
  const firstComments = new Set([...Object.values(first), '# Modèle linéaire — complète les expressions manquantes'])
  const lastComments = new Set([...Object.values(last), '# Même état que la dernière mise à jour visualisée'])
  return code.split('\n').map(line => firstComments.has(line) ? first[language] : lastComments.has(line) ? last[language] : line).join('\n')
}
