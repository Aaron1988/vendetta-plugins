import { findByProps, findByName, findByStoreName } from "@vendetta/metro";
import { after, before } from "@vendetta/patcher";
import translations from "../translations";
import filetypes from "../filetypes";
import { ReactNative, i18n } from "@vendetta/metro/common";

const RowManager = findByName("RowManager");
const ThemeStore = findByStoreName("ThemeStore");

const getEmbedThemeColors =
    findByName("getEmbedThemeColors") ??
    /* fallback just in case */ (() => ({
        colors: {
            borderColor: 335939079,
            backgroundColor: -14276817,
            headerColor: -4867391,
            headerText: "",
            acceptLabelGreenBackgroundColor: -14385083,
        },
    }));

function makeRPL(filename = "unknown", size = "? bytes") {
    const { colors } = getEmbedThemeColors(ThemeStore.theme);
    return {
        borderColor: colors.borderColor,
        backgroundColor: colors.backgroundColor,
        thumbnailCornerRadius: 15,
        headerColor: colors.headerColor,
        headerText: "",
        acceptLabelBackgroundColor: colors.acceptLabelGreenBackgroundColor,
        titleText: i18n.Messages.SEARCH_ANSWER_HAS_ATTACHMENT.toUpperCase() + " — " + size,
        type: null,
        extendedType: 4,
        participantAvatarUris: [],
        acceptLabelText: translations.PREVIEW[i18n.getLocale()] ?? "Preview",
        noParticipantsText: "\n" + filename,
        ctaEnabled: true,
    };
}

function handleRow(row) {
    const { message } = row;
    if (!message) return;
    if (!message.attachments) return;
    let rpls: any[] = [];
    let attachs: any[] = [];
    message.attachments.forEach((attachment) => {
        if (filetypes.has(attachment.filename.toLowerCase().split(".").pop())) {
            rpls.push(makeRPL(attachment.filename, attachment.size));
        } else {
            attachs.push(attachment);
        }
    });
    if (rpls.length) {
        if (!message.codedLinks?.length) message.codedLinks = [];
        message.codedLinks.push(...rpls);
        message.attachments = attachs;
    }
}

const { NativeModules: nm } = ReactNative;

const { DCDChatManager, InfoDictionaryManager, RTNClientInfoManager } = nm;
const clientInfo = InfoDictionaryManager ?? RTNClientInfoManager;

export default function () {
    if (parseInt(clientInfo.Build) > 200013) {
        return before("updateRows", DCDChatManager, (args) => {
            var rows = JSON.parse(args[1]);

            for (const row of rows) {
                handleRow(row);
            }

            args[1] = JSON.stringify(rows);
        });
    } else {
        return after("generate", RowManager.prototype, (_, row) => {
            handleRow(row);
        });
    }
}
