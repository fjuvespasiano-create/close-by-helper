
-- Seed curated public services for Vespasiano and São José da Lapa (MG)
-- Sources: prefeituras (vespasiano.mg.gov.br, saojosedalapa.mg.gov.br) and dados públicos.

DO $$
DECLARE
  vesp uuid := 'c4ccc60b-b17c-4e91-968e-4d38ab42e734';
  sjl  uuid := 'd9203559-409c-4512-ae93-a5d398afe0b0';
BEGIN

-- Prevent duplicates on re-run
DELETE FROM public.public_services WHERE city_id IN (vesp, sjl) AND created_at IS NOT NULL AND updated_at = created_at AND description LIKE '[seed]%';

-- =============== VESPASIANO ===============

INSERT INTO public.public_services (city_id, category, name, subtype, description, address, neighborhood, phone, website, hours, is_24h, featured) VALUES
(vesp,'prefeitura','Prefeitura Municipal de Vespasiano','Sede administrativa','[seed] Sede do governo municipal — protocolo, atendimento ao cidadão e secretarias.','Av. Prefeito Sebastião Fernandes, 25','Centro','(31) 3621-7500','https://www.vespasiano.mg.gov.br','Seg a Sex, 8h às 17h',false,true),
(vesp,'prefeitura','Câmara Municipal de Vespasiano','Poder legislativo','[seed] Casa legislativa do município.','Rua Deputado Sinval Boaventura, 180','Centro','(31) 3625-1017','https://www.camaravespasiano.mg.gov.br','Seg a Sex, 8h às 17h',false,false),
(vesp,'prefeitura','Secretaria Municipal de Saúde','Secretaria','[seed] Gestão da rede pública de saúde municipal.','Av. Prefeito Sebastião Fernandes, 25','Centro','(31) 3621-7500',NULL,'Seg a Sex, 8h às 17h',false,false),
(vesp,'prefeitura','Secretaria Municipal de Educação','Secretaria','[seed] Rede municipal de ensino e matrículas.','Av. Prefeito Sebastião Fernandes, 25','Centro','(31) 3621-7500',NULL,'Seg a Sex, 8h às 17h',false,false),

(vesp,'saude','UPA Vespasiano','UPA 24h','[seed] Unidade de Pronto Atendimento — urgência e emergência 24h.','Av. Vereador Alberto Rodrigues, s/n','Nova Pampulha','(31) 3627-1500',NULL,'24 horas',true,true),
(vesp,'saude','Hospital São Judas Tadeu','Hospital','[seed] Atendimento hospitalar de referência na região.','Rua Antônio Alves Lima, 60','Nova Pampulha','(31) 3625-1400',NULL,'24 horas',true,true),
(vesp,'saude','UBS Centro','UBS','[seed] Unidade Básica de Saúde — atendimento da atenção primária.','Rua Padre Eustáquio, 200','Centro','(31) 3621-2100',NULL,'Seg a Sex, 7h às 17h',false,false),
(vesp,'saude','UBS Nova Pampulha','UBS','[seed] Unidade Básica de Saúde do bairro Nova Pampulha.','Rua Ipê Amarelo, 100','Nova Pampulha','(31) 3627-1000',NULL,'Seg a Sex, 7h às 17h',false,false),
(vesp,'saude','UBS Morro Alto','UBS','[seed] Unidade Básica de Saúde do bairro Morro Alto.','Rua Padre Xavier, 55','Morro Alto','(31) 3624-4000',NULL,'Seg a Sex, 7h às 17h',false,false),
(vesp,'saude','CAPS Vespasiano','Saúde Mental','[seed] Centro de Atenção Psicossocial — apoio em saúde mental.','Rua Bela Vista, 120','Centro','(31) 3621-3300',NULL,'Seg a Sex, 8h às 17h',false,false),

(vesp,'educacao','Escola Estadual Padre Eustáquio','Escola Estadual','[seed] Ensino fundamental e médio.','Rua Padre Eustáquio, 350','Centro','(31) 3621-1700',NULL,'Seg a Sex',false,false),
(vesp,'educacao','Escola Municipal Prefeito Sebastião Fernandes','Escola Municipal','[seed] Ensino fundamental — rede municipal.','Rua das Palmeiras, 45','Centro','(31) 3621-1400',NULL,'Seg a Sex',false,false),
(vesp,'educacao','SENAI Vespasiano','Educação profissional','[seed] Cursos técnicos e profissionalizantes.','Rodovia MG-424, km 21','Nova Pampulha','(31) 3328-1000','https://www.fiemg.com.br/senai','Seg a Sex, 8h às 21h',false,false),

(vesp,'seguranca','Delegacia de Polícia Civil de Vespasiano','Polícia Civil','[seed] Registro de ocorrências e investigações.','Rua Antônio Alves Lima, 340','Centro','(31) 3625-1207',NULL,'Seg a Sex, 8h às 18h',false,true),
(vesp,'seguranca','45º Batalhão da Polícia Militar','Polícia Militar','[seed] Batalhão responsável pelo policiamento ostensivo.','Av. dos Estados, 700','Nova Pampulha','190',NULL,'24 horas',true,true),
(vesp,'seguranca','Guarda Municipal de Vespasiano','Guarda Municipal','[seed] Proteção do patrimônio público municipal e apoio à comunidade.','Av. Prefeito Sebastião Fernandes, 25','Centro','153',NULL,'24 horas',true,false),

(vesp,'transporte','Terminal Rodoviário de Vespasiano','Rodoviária','[seed] Ponto de embarque e desembarque de linhas intermunicipais.','Av. dos Estados, s/n','Centro',NULL,NULL,'Diariamente',false,false),

(vesp,'assistencia_social','CRAS Centro','CRAS','[seed] Centro de Referência de Assistência Social — Bolsa Família, CadÚnico e benefícios.','Rua Bela Vista, 90','Centro','(31) 3621-3200',NULL,'Seg a Sex, 8h às 17h',false,true),
(vesp,'assistencia_social','CRAS Nova Pampulha','CRAS','[seed] Atendimento de assistência social à família.','Rua das Acácias, 120','Nova Pampulha','(31) 3627-2000',NULL,'Seg a Sex, 8h às 17h',false,false),
(vesp,'assistencia_social','CREAS Vespasiano','CREAS','[seed] Centro de Referência Especializado — proteção social especial.','Rua Antônio Alves Lima, 200','Centro','(31) 3621-3400',NULL,'Seg a Sex, 8h às 17h',false,false),
(vesp,'assistencia_social','Conselho Tutelar de Vespasiano','Conselho Tutelar','[seed] Proteção dos direitos de crianças e adolescentes.','Rua Padre Eustáquio, 150','Centro','(31) 3621-3100',NULL,'24 horas (plantão)',true,false),

(vesp,'emergencia','SAMU Vespasiano','SAMU','[seed] Serviço de Atendimento Móvel de Urgência.','—','—','192',NULL,'24 horas',true,true),
(vesp,'emergencia','Corpo de Bombeiros - Vespasiano','Bombeiros','[seed] Resgate, combate a incêndio e emergências.','Av. dos Estados, s/n','Centro','193',NULL,'24 horas',true,true),
(vesp,'emergencia','Defesa Civil Vespasiano','Defesa Civil','[seed] Prevenção e resposta a desastres.','Av. Prefeito Sebastião Fernandes, 25','Centro','199',NULL,'24 horas',true,false);

-- =============== SÃO JOSÉ DA LAPA ===============

INSERT INTO public.public_services (city_id, category, name, subtype, description, address, neighborhood, phone, website, hours, is_24h, featured) VALUES
(sjl,'prefeitura','Prefeitura Municipal de São José da Lapa','Sede administrativa','[seed] Sede da administração municipal.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421','https://www.saojosedalapa.mg.gov.br','Seg a Sex, 8h às 17h',false,true),
(sjl,'prefeitura','Câmara Municipal de São José da Lapa','Poder legislativo','[seed] Casa legislativa do município.','Rua São Paulo, 100','Centro','(31) 3541-1200',NULL,'Seg a Sex, 8h às 17h',false,false),
(sjl,'prefeitura','Secretaria Municipal de Saúde','Secretaria','[seed] Gestão da rede pública de saúde.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421',NULL,'Seg a Sex, 8h às 17h',false,false),
(sjl,'prefeitura','Secretaria Municipal de Educação','Secretaria','[seed] Rede municipal de ensino e matrículas.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421',NULL,'Seg a Sex, 8h às 17h',false,false),

(sjl,'saude','UPA São José da Lapa','UPA 24h','[seed] Unidade de Pronto Atendimento — urgência 24h.','Rua Minas Gerais, s/n','Centro','(31) 3541-2500',NULL,'24 horas',true,true),
(sjl,'saude','UBS Centro','UBS','[seed] Unidade Básica de Saúde central.','Rua Rio de Janeiro, 700','Centro','(31) 3541-1100',NULL,'Seg a Sex, 7h às 17h',false,true),
(sjl,'saude','UBS Nossa Senhora da Conceição','UBS','[seed] Unidade Básica de Saúde do bairro.','Rua Espírito Santo, 45','Nossa Sra. da Conceição','(31) 3541-1250',NULL,'Seg a Sex, 7h às 17h',false,false),
(sjl,'saude','Farmácia Municipal','Farmácia','[seed] Dispensação gratuita de medicamentos da rede pública.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421',NULL,'Seg a Sex, 8h às 17h',false,false),

(sjl,'educacao','Escola Estadual Padre Vitor','Escola Estadual','[seed] Ensino fundamental e médio.','Rua São Paulo, 250','Centro','(31) 3541-1330',NULL,'Seg a Sex',false,false),
(sjl,'educacao','Escola Municipal Professora Maria Amélia','Escola Municipal','[seed] Ensino fundamental — rede municipal.','Rua Bahia, 120','Centro','(31) 3541-1550',NULL,'Seg a Sex',false,false),
(sjl,'educacao','SENAI São José da Lapa (pré-inscrição)','Educação profissional','[seed] Programas técnicos e cursos profissionalizantes.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421','https://www.saojosedalapa.mg.gov.br/pre-inscricao-senai','Seg a Sex',false,false),

(sjl,'seguranca','Delegacia de Polícia Civil de São José da Lapa','Polícia Civil','[seed] Registro de ocorrências e investigações.','Rua Ceará, 80','Centro','(31) 3541-1190',NULL,'Seg a Sex, 8h às 18h',false,true),
(sjl,'seguranca','Destacamento da Polícia Militar','Polícia Militar','[seed] Policiamento ostensivo — 45º BPM.','Rua Paraná, 40','Centro','190',NULL,'24 horas',true,false),
(sjl,'seguranca','Guarda Municipal de São José da Lapa','Guarda Municipal','[seed] Proteção do patrimônio público municipal.','Rua Rio de Janeiro, 550','Centro','153',NULL,'24 horas',true,false),

(sjl,'transporte','Ponto de Ônibus Central','Terminal urbano','[seed] Principal ponto de integração de linhas urbanas e intermunicipais.','Rua Rio de Janeiro, s/n','Centro',NULL,NULL,'Diariamente',false,false),

(sjl,'assistencia_social','CRAS São José da Lapa','CRAS','[seed] Centro de Referência de Assistência Social — CadÚnico e benefícios.','Rua Goiás, 100','Centro','(31) 3541-1600',NULL,'Seg a Sex, 8h às 17h',false,true),
(sjl,'assistencia_social','CREAS São José da Lapa','CREAS','[seed] Proteção social especial de média complexidade.','Rua Goiás, 120','Centro','(31) 3541-1610',NULL,'Seg a Sex, 8h às 17h',false,false),
(sjl,'assistencia_social','Conselho Tutelar de São José da Lapa','Conselho Tutelar','[seed] Proteção de crianças e adolescentes.','Rua Rio de Janeiro, 550','Centro','(31) 3541-1421',NULL,'24 horas (plantão)',true,false),

(sjl,'emergencia','SAMU São José da Lapa','SAMU','[seed] Serviço de Atendimento Móvel de Urgência.','—','—','192',NULL,'24 horas',true,true),
(sjl,'emergencia','Corpo de Bombeiros - Regional','Bombeiros','[seed] Atendimento regional de resgate e incêndio.','—','—','193',NULL,'24 horas',true,true),
(sjl,'emergencia','Defesa Civil de São José da Lapa','Defesa Civil','[seed] Prevenção e resposta a desastres.','Rua Rio de Janeiro, 550','Centro','199',NULL,'24 horas',true,false);

END $$;
