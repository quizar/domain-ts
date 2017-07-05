
const debug = require('debug')('quizar-domain');
import { Bluebird, md5, _ } from '../../utils';
import { Quiz, WikiEntity } from '../../entities';
import { QuizFields } from '../../entities/entity-fields';
import { Repository, RepAccessOptions, RepUpdateData, RepUpdateOptions, TopicCountRepository, QuizItemRepository } from '../repository';
import { UpdateUseCase } from '../update-use-case';
import { QuizItemValidator } from '../../entities/validator';
import { DataValidationError, DataConflictError, DataNotFoundError } from '../../errors';
import { CreateEntity, UpdateEntity } from '../entity';
import { prepareTopics, formatPropertyEntities, notExistsQuizItems } from '../helpers';
import { SetTopicCount } from '../set-topic-count';

export class UpdateQuiz extends UpdateUseCase<Quiz>{
    private setTopicCount: SetTopicCount<Quiz>;

    constructor(repository: TopicCountRepository<Quiz>, private quizItemRepository: QuizItemRepository, private createEntity: CreateEntity, updateEntity: UpdateEntity) {
        super('UpdateQuiz', repository, QuizItemValidator.instance);

        this.setTopicCount = new SetTopicCount<Quiz>(updateEntity, repository, 'countQuizzes');
    }

    protected innerExecute(data: RepUpdateData<Quiz>, options?: RepUpdateOptions): Bluebird<Quiz> {
        const itemData = data.item;

        return Bluebird.resolve(Array.isArray(itemData.topics))
            .then(setTopics => {
                if (setTopics) {
                    return this.repository.getById(itemData.id, { fields: [QuizFields.id, QuizFields.topics] })
                        .then(quiz => {
                            if (!quiz) {
                                return Bluebird.reject(new DataNotFoundError({ message: `Not found quiz id=${itemData.id}` }));
                            }
                            return _.differenceBy(itemData.topics || [], itemData.topics, 'id');
                        })
                        .then(deletedTopics => itemData.topics.concat(deletedTopics));
                }
            })
            .then(updatedTopics => prepareTopics(itemData.topics)
                .map(entity => this.createEntity.execute(entity).catch(DataConflictError, error => debug('trying to add an existing entity')))
                .return(notExistsQuizItems(this.quizItemRepository, itemData.items && itemData.items.map(item => item.item.id) || [])
                    .then(notExists => {
                        if (notExists.length) {
                            return Bluebird.reject(new DataNotFoundError({ message: `Not found QuizItem id in ${notExists}` }));
                        }
                        return super.innerExecute(data, options)
                            .then(quiz => {
                                if (updatedTopics && updatedTopics.length) {
                                    return Bluebird.map(updatedTopics, topic => this.setTopicCount.execute(topic.id)).return(quiz);
                                }

                                return quiz;
                            });
                    }))
            );
    }
}
