-- Correcao de tipo_campeonato/campeonato em nm_animais, gerada por
-- comparacao linha-a-linha entre o Catalogo Oficial PDF (43a Exposicao
-- Nacional) e o cadastro atual, casando por num_catalogo (chave unica -
-- 1639/1639 animais do banco bateram 1:1 com o PDF por num_catalogo, com
-- nome conferido tambem; id_catalogo NAO e unico no banco - 26 grupos com
-- valor repetido - entao nao serve como chave de casamento).
--
-- Os 129 animais abaixo estao cadastrados como Convencional mas o PDF
-- mostra Exclusivamente Marcha na propria linha do animal (o import
-- aparentemente usou so o cabecalho de secao do PDF, que agrupa varias
-- linhas, ao inves do valor individual de cada linha). tipo_marcha (MB/MP)
-- e categoria ja batiam certo em todos os 129 - so tipo_campeonato (e o
-- campo composto campeonato, que embute esse valor) precisa mudar.

begin;

-- catalogo 775 - MONALISA M CABALLERO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior' where num_catalogo = '775';

-- catalogo 776 - EPURA DE ROMA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior' where num_catalogo = '776';

-- catalogo 777 - INVICTA MJA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior' where num_catalogo = '777';

-- catalogo 778 - ZOE PORTEIRA AZUL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior Maior' where num_catalogo = '778';

-- catalogo 779 - JANUÁRIA AGÉO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior Maior' where num_catalogo = '779';

-- catalogo 780 - DONA MARIA DA ELISA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Júnior Maior' where num_catalogo = '780';

-- catalogo 782 - GALEGA DOIS MENINOS BELATHE DO BARU
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Jovem' where num_catalogo = '782';

-- catalogo 783 - JUÍZA SERRA BELA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Jovem' where num_catalogo = '783';

-- catalogo 784 - RAINHA DO ARO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Jovem' where num_catalogo = '784';

-- catalogo 785 - AMORA DO SOBERANO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Jovem' where num_catalogo = '785';

-- catalogo 786 - NUBIA QUATRO LAGOS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Jovem Maior' where num_catalogo = '786';

-- catalogo 790 - MARABA ROSE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua' where num_catalogo = '790';

-- catalogo 791 - GRÉCIA DA MORADA DIVINA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua' where num_catalogo = '791';

-- catalogo 792 - ZETA-JONES DA VENEZA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua' where num_catalogo = '792';

-- catalogo 793 - ELECTRA MJA DO CLARO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua' where num_catalogo = '793';

-- catalogo 794 - NOVIÇA RME DO MONTE ALTO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Maior' where num_catalogo = '794';

-- catalogo 795 - FÊNIX FORTEGA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Maior' where num_catalogo = '795';

-- catalogo 796 - ESTÂNCIA ARCO ÍRIS QUERENÇA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Maior' where num_catalogo = '796';

-- catalogo 797 - XEROKEE PORTEIRA AZUL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Maior' where num_catalogo = '797';

-- catalogo 798 - DEUSA VÔ LUIZ
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta' where num_catalogo = '798';

-- catalogo 799 - VODKA DA MORRO ALTO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta' where num_catalogo = '799';

-- catalogo 800 - ONDA DO CÓRREGO DA MATA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta' where num_catalogo = '800';

-- catalogo 801 - EXTRA DA FLOR
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta' where num_catalogo = '801';

-- catalogo 802 - HORTELÃ MTOSTES
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta Maior' where num_catalogo = '802';

-- catalogo 803 - FAMOSA DO PACOTUBA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta Maior' where num_catalogo = '803';

-- catalogo 804 - MALVADA BRZ FUMAÇA PRETA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta Maior' where num_catalogo = '804';

-- catalogo 805 - GOSTOSA RRL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Adulta Maior' where num_catalogo = '805';

-- catalogo 810 - CARABINA DO NOVO BOSQUE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Sênior Maior' where num_catalogo = '810';

-- catalogo 811 - VODKA DO SOBERANO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Sênior Maior' where num_catalogo = '811';

-- catalogo 812 - GERMANA PADRÃO DA MARCHA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Sênior Maior' where num_catalogo = '812';

-- catalogo 813 - ARCA PARDAL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Sênior Maior' where num_catalogo = '813';

-- catalogo 814 - HUMAITTÁ H.S.V.
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Graduada' where num_catalogo = '814';

-- catalogo 815 - OLARIA ELFAR TJ BAMBUÍ
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Graduada' where num_catalogo = '815';

-- catalogo 816 - TERNURA PORTEIRA AZUL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Graduada' where num_catalogo = '816';

-- catalogo 817 - BRANDA DO NOVO BOSQUE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Graduada' where num_catalogo = '817';

-- catalogo 818 - KIKA RK
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Graduada Maior' where num_catalogo = '818';

-- catalogo 822 - GOSTOSA H.Z.
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master' where num_catalogo = '822';

-- catalogo 823 - GADIVA DO ETAN
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master' where num_catalogo = '823';

-- catalogo 824 - IMPERATRIZ DO ROBY
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master' where num_catalogo = '824';

-- catalogo 825 - FARADIBA SAPECADO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master' where num_catalogo = '825';

-- catalogo 826 - LIDERANÇA RECANTO DAS PEDRAS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master Maior' where num_catalogo = '826';

-- catalogo 827 - QUINA DE MASCAN
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master Maior' where num_catalogo = '827';

-- catalogo 828 - PRAIANA DA SIRIEMA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master Maior' where num_catalogo = '828';

-- catalogo 829 - NOBREZA JP
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Égua Master Maior' where num_catalogo = '829';

-- catalogo 830 - HERDEIRO MJA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Júnior' where num_catalogo = '830';

-- catalogo 832 - DUQUE DA YASUI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Júnior Maior' where num_catalogo = '832';

-- catalogo 833 - DENDÊ BAVÁRIA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Júnior Maior' where num_catalogo = '833';

-- catalogo 834 - GESTOR DO GADU
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Jovem' where num_catalogo = '834';

-- catalogo 835 - MUSTANG SETE MARES
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Jovem' where num_catalogo = '835';

-- catalogo 836 - CAXIAS AVA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Jovem Maior' where num_catalogo = '836';

-- catalogo 837 - APACHE DE SAN GENARO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Jovem Maior' where num_catalogo = '837';

-- catalogo 838 - BERLIM JER
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo' where num_catalogo = '838';

-- catalogo 839 - CASTELO BAVÁRIA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo' where num_catalogo = '839';

-- catalogo 840 - PRIMITIVO JER
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Maior' where num_catalogo = '840';

-- catalogo 841 - DIAMANTE FGB
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Maior' where num_catalogo = '841';

-- catalogo 842 - ARGENTINO BASTIÃO VITOR LUEKIM
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Adulto' where num_catalogo = '842';

-- catalogo 843 - GALANTE DA SAVANA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Adulto' where num_catalogo = '843';

-- catalogo 844 - ESPIÃO DO NOVO BOSQUE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Adulto Maior' where num_catalogo = '844';

-- catalogo 846 - ESTEIO MV
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Sênior' where num_catalogo = '846';

-- catalogo 847 - CHEFE CEZARINA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Sênior' where num_catalogo = '847';

-- catalogo 848 - HABILIDOSO II KM F1 DO RIACHO FUNDO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Sênior Maior' where num_catalogo = '848';

-- catalogo 849 - BAMF WRX DA MONTE BRANCO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Sênior Maior' where num_catalogo = '849';

-- catalogo 850 - GIM MATIZA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado' where num_catalogo = '850';

-- catalogo 851 - CAMARO RIOMINAS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado' where num_catalogo = '851';

-- catalogo 852 - QUIXOTE ÁLIBI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado' where num_catalogo = '852';

-- catalogo 853 - BARÃO DO WALTER
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado Maior' where num_catalogo = '853';

-- catalogo 854 - INTRUSO DA MYLLA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado Maior' where num_catalogo = '854';

-- catalogo 855 - CARIOCA OGT
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Graduado Maior' where num_catalogo = '855';

-- catalogo 859 - TITÂNIO PORTEIRA AZUL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Master Maior' where num_catalogo = '859';

-- catalogo 860 - COMETA MJA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Master Maior' where num_catalogo = '860';

-- catalogo 861 - PANCHITO DE ALCATÉIA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MB - Cavalo Master Maior' where num_catalogo = '861';

-- catalogo 1506 - ALTEZA MORADA DE GUARATIBA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior' where num_catalogo = '1506';

-- catalogo 1507 - VISTA DA MATA GAD
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior' where num_catalogo = '1507';

-- catalogo 1508 - JUJUBA MARJOI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior' where num_catalogo = '1508';

-- catalogo 1509 - NAJA DO PISTOLINHA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior Maior' where num_catalogo = '1509';

-- catalogo 1510 - KATIMBA ELC
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior Maior' where num_catalogo = '1510';

-- catalogo 1511 - JASMIM DO RIO MUTUM
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Júnior Maior' where num_catalogo = '1511';

-- catalogo 1515 - CATARINA CFN
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Jovem Maior' where num_catalogo = '1515';

-- catalogo 1516 - MALU DA LAGOA DA ONÇA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Jovem Maior' where num_catalogo = '1516';

-- catalogo 1517 - ESTILOSA J.A DA GUAIÇARA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Jovem Maior' where num_catalogo = '1517';

-- catalogo 1518 - FLAUTA DO ENGENHO DE SERRA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua' where num_catalogo = '1518';

-- catalogo 1519 - FELINA HAVANA P. FELIZ
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua' where num_catalogo = '1519';

-- catalogo 1520 - GUEIXA SUCUPIRA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua' where num_catalogo = '1520';

-- catalogo 1521 - DUQUESA DA LOVELY
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Maior' where num_catalogo = '1521';

-- catalogo 1522 - IMPERATRIZ DA CENTRAL RETIRO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Maior' where num_catalogo = '1522';

-- catalogo 1523 - VERBENA HD DAS CARAÍBAS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Maior' where num_catalogo = '1523';

-- catalogo 1524 - NEGENETICA JGX
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Adulta' where num_catalogo = '1524';

-- catalogo 1525 - HERANÇA II MARJOI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Adulta' where num_catalogo = '1525';

-- catalogo 1527 - CELESTE MANGIA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Adulta Maior' where num_catalogo = '1527';

-- catalogo 1528 - HABILIDADE DO ESP. PRETO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Adulta Maior' where num_catalogo = '1528';

-- catalogo 1529 - IMPERATRIZ DO RIO AZUL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Adulta Maior' where num_catalogo = '1529';

-- catalogo 1530 - ESSENCIA DF
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior' where num_catalogo = '1530';

-- catalogo 1531 - GENIOSA MARJOI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior' where num_catalogo = '1531';

-- catalogo 1532 - IRONIA RECANTO REAL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior' where num_catalogo = '1532';

-- catalogo 1533 - ESMERALDA BS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior Maior' where num_catalogo = '1533';

-- catalogo 1534 - DELÍCIA DO HARDU
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior Maior' where num_catalogo = '1534';

-- catalogo 1535 - INSÔNIA ECV MONTE TERRA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Sênior Maior' where num_catalogo = '1535';

-- catalogo 1536 - DANÇA C.H.A
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Graduada' where num_catalogo = '1536';

-- catalogo 1537 - QUITÉRIA RECANTO DO VALE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Graduada' where num_catalogo = '1537';

-- catalogo 1538 - JUÍZA BEIRA RIO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Graduada' where num_catalogo = '1538';

-- catalogo 1539 - JÓIA BEIRA RIO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Graduada Maior' where num_catalogo = '1539';

-- catalogo 1543 - NÁDIA DO ROÇADO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master' where num_catalogo = '1543';

-- catalogo 1544 - ESMERALDA GAD
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master' where num_catalogo = '1544';

-- catalogo 1545 - SAFIRA CAMPANHENSE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master' where num_catalogo = '1545';

-- catalogo 1546 - DUQUESA VILA REAL
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master' where num_catalogo = '1546';

-- catalogo 1547 - DIVA 2B
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master Maior' where num_catalogo = '1547';

-- catalogo 1548 - GALENA DA PIMENTEIRA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master Maior' where num_catalogo = '1548';

-- catalogo 1549 - MUCAMBA JFS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master Maior' where num_catalogo = '1549';

-- catalogo 1550 - GAIATA DA LOUISE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Égua Master Maior' where num_catalogo = '1550';

-- catalogo 1551 - IMPOSSÍVEL DO CAMISÃO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Júnior' where num_catalogo = '1551';

-- catalogo 1552 - EMBAIXADOR DO ESCURO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Júnior' where num_catalogo = '1552';

-- catalogo 1553 - URUCUM DA TROPA DO NORTE
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Júnior Maior' where num_catalogo = '1553';

-- catalogo 1554 - GALANTE DO JEQUI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Júnior Maior' where num_catalogo = '1554';

-- catalogo 1555 - HEROI DO GAD
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Jovem' where num_catalogo = '1555';

-- catalogo 1556 - ÉPICO DO TFF
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Jovem' where num_catalogo = '1556';

-- catalogo 1559 - DALLAS KANONA DO MARCHADOR DA SERRA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo' where num_catalogo = '1559';

-- catalogo 1560 - LAMPIONE FAEL CAELIS
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo' where num_catalogo = '1560';

-- catalogo 1561 - CAMARAO RDT
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Maior' where num_catalogo = '1561';

-- catalogo 1562 - XERIFE DO ANGICO DO SOUZA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Maior' where num_catalogo = '1562';

-- catalogo 1563 - ESTOURO MARIQUITA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Maior' where num_catalogo = '1563';

-- catalogo 1564 - FIDEL 2B
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto' where num_catalogo = '1564';

-- catalogo 1565 - DIVINO DO RILUTAYI
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto' where num_catalogo = '1565';

-- catalogo 1566 - GRAND SLAM VB
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto' where num_catalogo = '1566';

-- catalogo 1567 - DAKAR HAVANA P. FELIZ
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto Maior' where num_catalogo = '1567';

-- catalogo 1568 - DELATOR H.D.
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto Maior' where num_catalogo = '1568';

-- catalogo 1569 - HIATO BEIRA RIO
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Adulto Maior' where num_catalogo = '1569';

-- catalogo 1573 - VELEIRO HELENA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Sênior Maior' where num_catalogo = '1573';

-- catalogo 1574 - GREGO DO ALCANÇU
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Sênior Maior' where num_catalogo = '1574';

-- catalogo 1575 - FATOR DA ERA SIKERINHA
update nm_animais set tipo_campeonato = 'Exclusivamente Marcha', campeonato = 'Exclusivamente Marcha - MP - Cavalo Sênior Maior' where num_catalogo = '1575';

commit;
