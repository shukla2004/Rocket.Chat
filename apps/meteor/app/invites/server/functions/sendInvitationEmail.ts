import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { Settings } from '@rocket.chat/models';

import * as Mailer from '../../../mailer/server/api';
import { hasPermission } from '../../../authorization/server';
import { settings } from '../../../settings/server';

let html = '';
Meteor.startup(() => {
	Mailer.getTemplate('Invitation_Email', (value) => {
		html = value;
	});
});

export const sendInvitationEmail = async (userId: string, emails: string[]) => {
	check(emails, [String]);
	if (!userId) {
		throw new Meteor.Error('error-invalid-user', 'Invalid user', {
			method: 'sendInvitationEmail',
		});
	}
	if (!hasPermission(userId, 'bulk-register-user')) {
		throw new Meteor.Error('error-not-allowed', 'Not allowed', {
			method: 'sendInvitationEmail',
		});
	}
	const validEmails = emails.filter(Mailer.checkAddressFormat);

	if (!validEmails || validEmails.length === 0) {
		throw new Meteor.Error('error-email-send-failed', 'No valid email addresses', {
			method: 'sendInvitationEmail',
		});
	}

	const subject = settings.get<string>('Invitation_Subject');

	if (!subject) {
		throw new Meteor.Error('error-email-send-failed', 'No subject', {
			method: 'sendInvitationEmail',
		});
	}

	return validEmails.filter((email) => {
		try {
			const mailerResult = Mailer.send({
				to: email,
				from: settings.get('From_Email'),
				subject,
				html,
				data: {
					email,
				},
			});

			Settings.incrementValueById('Invitation_Email_Count');
			return mailerResult;
		} catch ({ message }) {
			throw new Meteor.Error('error-email-send-failed', `Error trying to send email: ${message}`, {
				method: 'sendInvitationEmail',
				message,
			});
		}
	});
};
