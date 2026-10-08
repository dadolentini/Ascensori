export interface Equation {
  n: number;
  page: number;
  title: string;
  tex: string;
  explanation: string;
  kind?: 'Ricerca' | 'Screening';
}
export const equations: Equation[] = [
  {
    n: 1,
    page: 3,
    title: 'Una domanda che cambia nel tempo',
    tex: String.raw`\lambda_{od}(t)=\lambda^{\mathrm{apertura}}_{od}(t)+\lambda^{\mathrm{pranzo}}_{od}(t)+\lambda^{\mathrm{chiusura}}_{od}(t)+\lambda^{\mathrm{altro}}_{od}(t),\quad o\ne d`,
    explanation:
      'Le componenti di domanda origine–destinazione si sommano. Nella versione interattiva ogni pausa è una componente distinta, con ritorno dopo la propria durata.',
  },
  {
    n: 2,
    page: 3,
    title: 'Il ritorno dalla pausa',
    tex: String.raw`\lambda^{\mathrm{ritorno}}_{0f}(t)=N_f p_{\ell,f}\sum_{j=1}^{3}\pi_{f,j}\,\phi_{\sigma_{\ell,f}}(t-h_j-1),\quad\phi_\sigma(u)=\frac{e^{-u^2/(2\sigma^2)}}{\sqrt{2\pi}\sigma}`,
    explanation:
      'Nel caso documentato la pausa dura un’ora. Nf è l’organico del piano, p la partecipazione, π le quote delle fasce. Con tempi in ore, il tasso è in persone/ora; dividere per 60 per persone/minuto.',
  },
  {
    n: 3,
    page: 4,
    title: 'Basi gaussiane dei flussi',
    tex: String.raw`\widehat\lambda_s(t)=\beta_{s,0}+\sum_{j=1}^{4}\beta_{s,j}\exp\!\left[-\frac{(t-\mu_{s,j})^2}{2\sigma_{s,j}^2}\right],\quad\beta_{s,j}\ge0`,
    explanation:
      'I centri e le dispersioni derivano dalle fasce configurate. I coefficienti sono intensità, non probabilità normalizzate. Il caso PDF usa quattro basi più intercetta.',
  },
  {
    n: 4,
    page: 4,
    title: 'Best fit non negativo',
    tex: String.raw`\widehat{\boldsymbol\beta}_s=\underset{\boldsymbol\beta_s\ge0}{\arg\min}\;\|X_s\boldsymbol\beta_s-\overline{\boldsymbol y}_{s,\mathrm{train}}\|_2^2`,
    explanation:
      'NNLS sui tassi ricavati dai conteggi di 10 minuti, in passeggeri/minuto: sei giornate di training e due escluse dal fit. È diagnostica, non la logica di parcheggio per fasce.',
  },
  {
    n: 5,
    page: 5,
    title: 'Il tempo fisico di movimento',
    tex: String.raw`\delta=h|f-g|,\quad T_{\mathrm{moto}}=\begin{cases}2\sqrt{\delta/a}&\delta\le v^2/a\\\delta/v+v/a&\delta>v^2/a\end{cases}\quad T_{\mathrm{fermata}}=t_{\mathrm{porta}}+t_{\mathrm{trasf}}(n_{\mathrm{saliti}}+n_{\mathrm{scesi}})`,
    explanation:
      'Profilo simmetrico ideale: h in metri, v in m/s, a in m/s². Una porta per fermata, con gli sbarchi prima degli imbarchi. Jerk e livellamento non sono modellati.',
  },
  {
    n: 6,
    page: 5,
    title: 'La capacità effettiva',
    tex: String.raw`L_e(t)+w_r\le Q_e,\qquad n_e(t)+1\le C_e`,
    explanation:
      'Massa misurata e posti sono vincoli distinti. Un utente non ammissibile resta in attesa; lo sbarco è sempre consentito e ha precedenza.',
  },
  {
    n: 7,
    page: 5,
    title: 'Una riserva prudenziale',
    tex: String.raw`\widehat L_e(k)=L_e(t)+\sum_{r\in P_e^{(k)}}\widetilde w-\sum_{r\in D_e^{(k)}}w_r^*\le\rho Q_e,\qquad\widehat n_e(k)\le C_e`,
    explanation:
      'Per chiamate future si riservano 87 kg; ρ=0,96. Per gli utenti già a bordo si usa la massa reale. Il vincolo viene verificato lungo tutte le fermate candidate.',
  },
  {
    n: 8,
    page: 5,
    title: 'Un primo screening di dimensionamento',
    tex: String.raw`HC_{5\,\mathrm{min}}=\frac{300mP}{RTT},\qquad INT=\frac{RTT}{m}`,
    explanation:
      'm cabine, P carico medio di progetto in persone, RTT in secondi. Queste formule non sostituiscono la simulazione e INT non è il tempo medio di attesa.',
    kind: 'Screening',
  },
  {
    n: 9,
    page: 6,
    title: 'La migliore decisione marginale',
    tex: String.raw`(e^*,i^*,j^*)=\underset{\substack{e\in E,\ i<j\\S_e\oplus(P_r,D_r)\in\mathcal F}}{\arg\min}\left[J_t(S_e\oplus_i P_r\oplus_j D_r)-J_t(S_e)\right]`,
    explanation:
      'Si enumerano gli inserimenti fattibili del prelievo Pr e dello sbarco Dr. Prelievo prima dello sbarco; una tratta iniziata non può cambiare destinazione. È greedy a orizzonte mobile, non ottimizzazione globale della giornata.',
  },
  {
    n: 10,
    page: 6,
    title: 'Attesa, viaggio e coda lunga',
    tex: String.raw`J_t(S)=\sum_{r\in\mathcal W(S)}\!\left[\widehat W_r^{\mathrm{res}}+\frac{\zeta}{100}[\widehat W_r^{\mathrm{tot}}-w_0]_+^2\right]+\alpha\sum_{r\in\mathcal A(S)}\widehat R_r^{\mathrm{res}}`,
    explanation:
      'α=0,33; ζ=0,035; w0=120 s. L’attesa residua è ETAprelievo−t; quella totale ETAprelievo−comparsa. La penale è morbida e non garantisce attese inferiori a 120 secondi.',
  },
  {
    n: 11,
    page: 6,
    title: 'Il possibile passo successivo: MPC',
    tex: String.raw`\min_{\{S_e\}}\mathbb E\!\left[\sum_{r\in[t,t+H]}\left(W_r+\alpha R_r+\gamma[W_r-w_0]_+^2\right)+\eta\sum_e D_e\big(\widehat\lambda(t:t+H)\big)\right]`,
    explanation:
      'Formulazione di ricerca del PDF. Non implementata nel materiale né nella landing. I coefficienti energetici non sono calibrati; nessun risparmio di energia viene dedotto dai piani percorsi.',
    kind: 'Ricerca',
  },
  {
    n: 12,
    page: 10,
    title: 'Portata e capacità prudenziale',
    tex: String.raw`HC_{5\,\mathrm{min}}(Q)=\frac{300m}{145}\min\!\left(13,\left\lfloor\frac{0{,}96Q}{87}\right\rfloor\right)`,
    explanation:
      'RTT=145 s e 13 posti sono assunzioni del caso illustrativo. La soglia prudenziale produce una curva a gradini. Il picco del PDF differisce fra figura (67,8) e testo (circa 71): nella simulazione si ricalcola.',
    kind: 'Screening',
  },
  {
    n: 13,
    page: 11,
    title: 'Uffici diversi, un unico piano',
    tex: String.raw`N_f=\sum_oN_o\mathbf1_{\{f_o=f\}},\qquad\lambda_f^{\downarrow}(t)=\sum_{o:f_o=f}\lambda_o^{\mathrm{pranzo}}(t)`,
    explanation:
      'Un piano può ospitare più uffici. Si mantengono identità e pause distinte, poi si aggrega la domanda al piano senza duplicare gli addetti.',
  },
  {
    n: 14,
    page: 11,
    title: 'Apprendere senza inseguire il rumore',
    tex: String.raw`\widehat\mu_o=\frac{n_o\overline t_o+\kappa h_o}{n_o+\kappa},\qquad\widehat p_o=\frac{n_o+\alpha_p p_o}{DN_o+\alpha_p}`,
    explanation:
      'no eventi storici di pausa, ho orario dichiarato, D giorni, No addetti. κ=22 eventi; αp=12 persone-giorno (distinto da α del costo). Senza storico si torna al programma dichiarato.',
  },
  {
    n: 15,
    page: 11,
    title: 'Dispersione e intensità apprese',
    tex: String.raw`\widehat\sigma_o^2=\frac{n_os_o^2+\kappa\sigma_0^2}{n_o+\kappa},\qquad\widehat\lambda_o(t)=N_o\widehat p_o\phi_{\widehat\sigma_o}(t-\widehat\mu_o)`,
    explanation:
      'Dodici giornate sintetiche di training e quattro di validation. Modello addestrato prima del controllo, non online; mai usa gli offset latenti del generatore.',
  },
  {
    n: 16,
    page: 12,
    title: 'Guardare dodici minuti avanti',
    tex: String.raw`\widehat D_o(t;L,H)=N_o\widehat p_o\left[\Phi\!\left(\frac{t+L+H-\widehat\mu_o}{\widehat\sigma_o}\right)-\Phi\!\left(\frac{t+L-\widehat\mu_o}{\widehat\sigma_o}\right)\right]`,
    explanation:
      'H=12 min, anticipo L=3 min. Φ è la CDF normale standard. Il rientro trasla la media della durata della pausa. Nella versione a più pause si calcola una componente per ciascuna.',
  },
  {
    n: 17,
    page: 13,
    title: 'Il guadagno di copertura',
    tex: String.raw`G_f(k_f)=30\frac{D_f^{1{,}25}-[D_f-qk_f]_+^{1{,}25}}{\max(1,D_f^{0{,}25})},\qquad q=0{,}82\min\!\left(C,\left\lfloor\frac{\rho Q}{\widetilde w}\right\rfloor\right)`,
    explanation:
      'kf cabine concentrate al piano, Df domanda prevista. q è capacità operativa ipotizzata nell’orizzonte, distinta dalla portata fisica. Il guadagno marginale diminuisce all’aumentare della copertura.',
  },
  {
    n: 18,
    page: 13,
    title: 'Copertura contro costo del movimento',
    tex: String.raw`\max_x\left[\sum_fG_f(k_f)-0{,}10\sum_{ef}T_{ef}x_{ef}-0{,}10\sum_{ef}d_{ef}x_{ef}\right]`,
    explanation:
      'Tempo e distanza di riposizionamento penalizzano spostamenti poco utili. I coefficienti sono euristici dello studio, non costi energetici misurati.',
  },
  {
    n: 19,
    page: 13,
    title: 'Una cabina resta a coprire il sistema',
    tex: String.raw`x_{ef}\in\{0,1\},\quad\sum_fx_{ef}\le1,\quad\sum_{ef}x_{ef}\le m_{\mathrm{idle}}-1,\quad k_f\le3`,
    explanation:
      'Solo cabine inattive; una resta nella copertura diffusa. Allocazione greedy marginale, non solver esatto. Chiamate reali e utenti a bordo prevalgono sempre sul parcheggio.',
  },
];
