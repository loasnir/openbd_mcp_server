/**
 * OpenBD API型定義
 *
 * OpenBD APIのレスポンスデータ構造を定義します。
 * docs/03-data-structure.md を参照
 */

/**
 * Summary セクション - 基本的な書誌情報
 */
export interface OpenBDSummary {
  isbn: string;
  title: string;
  volume: string;
  series: string;
  publisher: string;
  pubdate: string;  // YYYYMMDD形式
  cover: string;    // 書影URL
  author: string;
}

/**
 * ONIX セクション - JPRO-ONIX準拠の詳細書誌データ
 * 完全な型定義は膨大なため、主要フィールドのみ定義
 */
export interface OpenBDOnix {
  RecordReference?: string;
  NotificationType?: string;
  ProductIdentifier?: {
    ProductIDType: string;
    IDValue: string;
  }[];
  DescriptiveDetail?: {
    ProductComposition?: string;
    ProductForm?: string;
    ProductFormDetail?: string[];
    Measure?: {
      MeasureType: string;
      Measurement: string;
      MeasureUnitCode: string;
    }[];
    TitleDetail?: {
      TitleType: string;
      TitleElement: {
        TitleElementLevel: string;
        TitleText: {
          content: string;
          collationkey?: string;
        };
        Subtitle?: {
          content: string;
        };
      }[];
    };
    Contributor?: {
      SequenceNumber?: string;
      ContributorRole: string[];
      PersonName?: {
        content: string;
        collationkey?: string;
      };
      BiographicalNote?: string;
    }[];
    Language?: {
      LanguageRole: string;
      LanguageCode: string;
    }[];
    Extent?: {
      ExtentType: string;
      ExtentValue: string;
      ExtentUnit: string;
    }[];
    Subject?: {
      SubjectSchemeIdentifier: string;
      SubjectCode: string;
    }[];
  };
  CollateralDetail?: {
    TextContent?: {
      TextType: string;
      ContentAudience?: string;
      Text: string;
    }[];
    SupportingResource?: {
      ResourceContentType: string;
      ContentAudience?: string;
      ResourceMode: string;
      ResourceVersion: {
        ResourceForm: string;
        ResourceVersionFeature?: {
          ResourceVersionFeatureType: string;
          FeatureValue: string;
        }[];
        ResourceLink: string;
      }[];
    }[];
  };
  PublishingDetail?: {
    Imprint?: {
      ImprintName: string;
    };
    Publisher?: {
      PublishingRole: string;
      PublisherName?: string;
    }[];
    PublishingStatus?: string;
    PublishingDate?: {
      PublishingDateRole: string;
      Date: string;
    }[];
  };
  ProductSupply?: {
    SupplyDetail?: {
      ReturnsConditions?: {
        ReturnsCode: string;
        ReturnsCodeTypeName?: string;
      };
      ProductAvailability?: string;
      Price?: {
        PriceType?: string;
        PriceAmount?: number;
        CurrencyCode?: string;
      }[];
    };
  };
}

/**
 * Hanmoto セクション - 版元ドットコム独自データ
 */
export interface OpenBDHanmoto {
  datecreated?: string;
  datemodified?: string;
  dateshuppan?: string;
  datekokai?: string;

  // 在庫状況
  zaiko?: number;  // 1: 在庫あり, 2: 重版未定, 3: 品切れ, 4: 絶版
  maegakinado?: string;  // まえがき・内容紹介
  kaisetsu105w?: string;  // 解説105文字

  // 著者情報
  author?: {
    listseq?: number;
    dokujikubun?: string;
  }[];

  // 書評情報
  reviews?: {
    post_user?: string;
    reviewer?: string;
    source_id?: number;
    kubun_id?: number;
    source?: string;
    choyukan?: string;
    han?: string;
    link?: string;
    appearance?: string;
    gou?: string;
    date?: string;
  }[];

  // 版元からひとこと
  hanmotokarahitokoto?: string;

  // その他
  bikou?: string;
  toji?: string;
  zaiko_hokanbasho?: string;
  kankoukeitai?: string;
  sonotatokkijikou?: string;
  jushoujouhou?: string;
  genrecodetrc?: number;
  genrecodetrcjidou?: number;
  rubynoumu?: string;
  ndccode?: string;
  kanrensho?: string;
  tsuiki?: string;
  bessoushiryou?: string;
  copyrightinfomation?: string;
  dokushakakikomi?: string;
}

/**
 * OpenBD 書籍データ - 完全なレスポンス
 */
export interface OpenBDBook {
  summary: OpenBDSummary;
  onix?: OpenBDOnix;
  hanmoto?: OpenBDHanmoto;
}

/**
 * OpenBD API レスポンス型
 */
export type OpenBDResponse = (OpenBDBook | null)[];

/**
 * OpenBD カバレッジレスポンス
 */
export type OpenBDCoverageResponse = string[];

/**
 * OpenBD スキーマレスポンス
 */
export type OpenBDSchemaResponse = Record<string, unknown>;
