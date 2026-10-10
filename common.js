/* Ортақ деректер: тапсырмалар, критерийлер, баға шкаласы. index.html және teacher.html қолданады.
   Критерийлердің ретін мен баллын index.html ішіндегі PRAC массивімен сәйкес ұстаңыз. */
window.APP = {
  TASKS: [
    { name: 'Жапырақ',      max: 30, budget: 18, rub: [['Қаңқа', 8], ['Attach', 6], ['Surface', 8], ['Flip Normals / Shell', 5], ['Пішін', 3]] },
    { name: 'Гүл құмырасы', max: 18, budget: 7,  rub: [['Жапырақ, айналу центрі', 6], ['Array', 8], ['Көрініс', 4]] },
    { name: 'Қасық',        max: 12, budget: 5,  rub: [['Контур, қималар', 5], ['Surface', 4], ['Түбі', 3]] }
  ],
  PART_MAX: 30,        // қатысым балының жоғарғы шегі
  TEST_MAX: 10,        // тест балы (5 сұрақ x 2)
  FAST_RATIO: 0.4,     // бюджеттің осы үлесінен тез жіберсе, «тым тез» белгісі шығады
  GRADES: [[95,'A'],[90,'A-'],[85,'B+'],[80,'B'],[75,'B-'],[70,'C+'],[65,'C'],[60,'C-'],[55,'D+'],[50,'D'],[0,'F']],
  grade: function (p) { for (var i = 0; i < this.GRADES.length; i++) if (p >= this.GRADES[i][0]) return this.GRADES[i][1]; return 'F'; },
  // студенттің кілті: топ + аты (кіші әріппен, бос орындарсыз)
  key: function (group, name) {
    return (group + '_' + name).toLowerCase().replace(/[^a-z0-9Ѐ-ӿӘәҒғҚқҢңӨөҰұҮүҺһІі]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  },
  test: function (run) { return Math.min(this.TEST_MAX, +(run && run.test) || 0); },
  total: function (run) { return this.sum(run) + this.test(run) + Math.min(this.PART_MAX, Math.max(0, +(run && run.part) || 0)); },
  sum: function (run) { var s = 0; for (var i = 0; i < 3; i++) { var t = run && run['t' + i]; if (t && t.st === 'done') s += +t.score || 0; } return s; }
};
