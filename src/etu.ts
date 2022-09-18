import axios, { AxiosInstance } from "axios";

interface EtuUTTUser {
  role: string;
  group: {
    id: number;
    name: string;
    description: string;
    internal_name: string;
    position: number;
  };
  _embed: {
    user: {
      discordTag: string | null;
      wantsJoinUTTDiscord: boolean;
    };
  };
}

interface EtuUTTCredentials {
  type: string;
  access_token: string;
  expires: number;
}

interface EtuUTTOrga {
  name: string;
  id: string;
}

interface EtuUTTOrgaWithMembers {
  name: string;
  members: {
    role: string;
    group: {
      id: number;
      name: string;
      description: string;
      internal_name: string;
      position: number;
    };
    discordTag: string;
    wantsJoinUTTDiscord: boolean;
  }[];
}

export type AssoMembers = {
  [discordTag: string]: {
    [assoName: string]: string;
  };
};

let api: AxiosInstance;

/**
 * Login to EtuUTT API
 */
async function login(): Promise<EtuUTTCredentials> {
  const response = await axios.post(
    `${process.env.ETU_UTT_ENDPOINT}/api/oauth/token`,
    {
      grant_type: "client_credentials",
      client_id: process.env.ETU_UTT_ID,
      client_secret: process.env.ETU_UTT_SECRET,
    },
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "User-Agent": `DiscordAsso`,
      },
    }
  );
  return {
    type: response.data.token_type,
    access_token: response.data.access_token,
    expires: response.data.expires,
  };
}

/**
 * Retrieves the list of all organizations (and their id/login)
 * @returns {Promise<EtuUTTOrga[]>} List of all orga
 */
export async function fetchAssos(): Promise<EtuUTTOrga[]> {
  const token = await login();
  api = axios.create({
    headers: {
      Authorization: `${token.type} ${token.access_token}`,
      "User-Agent": `DiscordAsso`,
    },
  });
  const listorgas = await api.get<{ data: { name: string; login: string }[] }>(
    `${process.env.ETU_UTT_ENDPOINT}/api/public/listorgas`
  );
  return listorgas.data.data
    .map((asso) => ({
      name: asso.name,
      id: asso.login,
    }))
    .filter((asso) => !/^(?:E|É)lus?\s/iu.test(asso.name));
}

/**
 * Retrieves the list of all organizations (and their members)
 * @returns {Promise<EtuUTTOrgaWithMembers[]>} List of all orga with their members
 */
async function fetchAssoMembers(): Promise<EtuUTTOrgaWithMembers[]> {
  const assos = await fetchAssos();
  return Promise.all(
    assos.map(async (asso) => {
      const orgaMembers = await api.get(
        `${process.env.ETU_UTT_ENDPOINT}/api/public/orgas/${asso.id}/members`
      );
      return {
        name: asso.name,
        members: orgaMembers.data.data.map((user: EtuUTTUser) => {
          return {
            role: user.role,
            group: user.group,
            discordTag: user._embed.user.discordTag,
            wantsJoinUTTDiscord: user._embed.user.wantsJoinUTTDiscord,
          };
        }),
      };
    })
  );
}

/**
 * Retrieves the assos of discord users. Filters out users who don't want to join the discord server
 * (according to the EtuUTT profile preference).
 * @returns {Promise<AssoMembers>} List of all discord tags and their associated assos
 */
export async function fetchMembers(): Promise<AssoMembers> {
  const assos = await fetchAssoMembers();
  const members: AssoMembers = {};

  for (const asso of assos) {
    for (const member of asso.members) {
      if (member.discordTag && member.wantsJoinUTTDiscord) {
        if (!members[member.discordTag]) members[member.discordTag] = {};
        members[member.discordTag][asso.name] = member.group.name;
      }
    }
  }

  return members;
}
